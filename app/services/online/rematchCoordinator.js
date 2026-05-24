// Coordinador de revancha — vive fuera del ciclo de React para sobrevivir
// al unmount de MainMenu cuando MatchResult muestra resultado del match.
//
// Antes la logica vivia en closures dentro de MainMenu.onMatchStart, que
// quedaban con setters muertos al desmontarse → modal nunca aparecia y
// nueva sala nunca se mostraba.

import { Bridge } from '../../../shared/bridge.js';
import { createRoom, joinRoomById } from '../supabase/rooms.js';

let _sync    = null;
let _room    = null;
let _role    = null;
let _profile = null;
let _myPilot = null;

export function attachRematchSync({ sync, room, role, profile, myPilot }) {
  _sync = sync;
  _room = room;
  _role = role;
  _profile = profile;
  _myPilot = myPilot;

  sync.onRematchInvite((payload) => {
    Bridge.setState({ onlinePendingInvite: payload });
  });
  sync.onRematchAccept(({ newRoomId }) => {
    // Mi propuesta aceptada — proposer ya esta en su nueva sala como host.
    // Solo confirma estado (la sala ya fue seteada en proposeRematch).
    Bridge.setState({ onlinePendingRoom: { roomId: newRoomId, role: 'host' } });
  });
  sync.onRematchDecline(() => {
    Bridge.setState({ onlinePendingInvite: null });
  });
}

export async function proposeRematch() {
  if (!_sync || !_profile) return;
  try {
    const { roomId: newRoomId } = await createRoom({
      playerId: _profile.playerId,
      displayName: _profile.displayName,
      isPrivate: false,
    });
    _sync.broadcastRematchInvite({ newRoomId, fromPilot: _myPilot });
    Bridge.setState({ onlinePendingRoom: { roomId: newRoomId, role: 'host' } });
  } catch (e) {
    console.warn('[rematch] propose falla', e);
  }
}

export async function acceptRematch() {
  const invite = Bridge.peekState().onlinePendingInvite;
  if (!invite || !_sync || !_profile) return;
  try {
    await joinRoomById({
      roomId: invite.newRoomId,
      playerId: _profile.playerId,
      displayName: _profile.displayName,
    });
    _sync.broadcastRematchAccept({ newRoomId: invite.newRoomId });
    Bridge.setState({
      onlinePendingInvite: null,
      onlinePendingRoom:   { roomId: invite.newRoomId, role: 'guest' },
    });
    // Salir de MatchResult → MainMenu monta y abre RoomScreen via pendingRoom.
    Bridge.commands.exitToMenu();
  } catch (e) {
    console.warn('[rematch] accept falla', e);
  }
}

export function declineRematch() {
  if (_sync) {
    try { _sync.broadcastRematchDecline({}); } catch { /* ignore */ }
  }
  Bridge.setState({ onlinePendingInvite: null });
}

export function detachRematchSync() {
  _sync = null; _room = null; _role = null; _profile = null; _myPilot = null;
}

export function clearPendingRoom() {
  Bridge.setState({ onlinePendingRoom: null });
}
