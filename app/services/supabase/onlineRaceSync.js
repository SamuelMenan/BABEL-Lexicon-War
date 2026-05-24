// Capa de sincronizacion para carrera online (fase 2).
// Maneja el canal de broadcast Supabase Realtime + bridge.
//
// Uso desde MainMenu cuando RoomScreen detecta status='starting':
//   const sync = await startOnlineRaceSync({ roomId, role, ... });
//   ...al cerrar carrera:
//   sync.dispose();
//
// API:
//   sync.broadcastTick({ avgWpm, distance, phrasesDone, accuracy })
//   sync.broadcastFinish({ avgWpm, accuracy })
//   sync.onRemoteTick(cb)
//   sync.onRemoteFinish(cb)
//   sync.dispose()

import { Bridge } from '../../../shared/bridge.js';
import { EventBus } from '../../../shared/events.js';
import { openRoomChannel } from './rooms.js';

const TICK_HZ = 10;          // 10 broadcast/sec por jugador
const TICK_MIN_INTERVAL_MS = 1000 / TICK_HZ;
const DISCONNECT_TIMEOUT_MS = 10000;  // sin ticks > 10s → considerar rival caido

export function createOnlineRaceSync(roomId) {
  let lastSent = 0;
  let lastRemoteAt = performance.now();
  let onTickCbs = [];
  let onFinishCbs = [];
  let onDisconnectCbs = [];
  let disconnectFired = false;

  let onRematchInviteCbs = [];
  let onRematchAcceptCbs = [];
  let onRematchDeclineCbs = [];

  const channel = openRoomChannel(roomId, ({ event, payload }) => {
    lastRemoteAt = performance.now();
    if (event === 'tick') {
      Bridge.setState({ onlineOpponentStats: payload, onlineConnection: 'connected' });
      onTickCbs.forEach((cb) => cb(payload));
    } else if (event === 'finish') {
      onFinishCbs.forEach((cb) => cb(payload));
    } else if (event === 'disconnect') {
      onDisconnectCbs.forEach((cb) => cb(payload));
    } else if (event === 'rematch_invite') {
      onRematchInviteCbs.forEach((cb) => cb(payload));
    } else if (event === 'rematch_accept') {
      onRematchAcceptCbs.forEach((cb) => cb(payload));
    } else if (event === 'rematch_decline') {
      onRematchDeclineCbs.forEach((cb) => cb(payload));
    }
  });

  // Watchdog: si pasan >10s sin tick del rival, fire disconnect callbacks.
  const watchdog = setInterval(() => {
    if (disconnectFired) return;
    const silenceMs = performance.now() - lastRemoteAt;
    if (silenceMs > DISCONNECT_TIMEOUT_MS) {
      disconnectFired = true;
      Bridge.setState({ onlineConnection: 'lost' });
      onDisconnectCbs.forEach((cb) => cb({ reason: 'timeout', silenceMs }));
    }
  }, 1000);

  // Forward eventos locales de tick desde RacingSystem.
  const offTick = EventBus.on('online:race_tick_local', (stats) => {
    const now = performance.now();
    if (now - lastSent < TICK_MIN_INTERVAL_MS) return;
    lastSent = now;
    channel.send('tick', stats);
  });

  const offFinish = EventBus.on('online:race_finish_local', (stats) => {
    channel.send('finish', stats);
  });

  return {
    broadcastTick:    (s) => channel.send('tick', s),
    broadcastFinish:  (s) => channel.send('finish', s),
    broadcastRematchInvite:  (p) => channel.send('rematch_invite', p),
    broadcastRematchAccept:  (p) => channel.send('rematch_accept', p),
    broadcastRematchDecline: (p) => channel.send('rematch_decline', p),
    onRemoteTick:     (cb) => { onTickCbs.push(cb); },
    onRemoteFinish:   (cb) => { onFinishCbs.push(cb); },
    onDisconnect:     (cb) => { onDisconnectCbs.push(cb); },
    onRematchInvite:  (cb) => { onRematchInviteCbs.push(cb); },
    onRematchAccept:  (cb) => { onRematchAcceptCbs.push(cb); },
    onRematchDecline: (cb) => { onRematchDeclineCbs.push(cb); },
    dispose: () => {
      clearInterval(watchdog);
      offTick(); offFinish();
      try { channel.unsub(); } catch { /* ignore */ }
      onTickCbs = []; onFinishCbs = []; onDisconnectCbs = [];
      onRematchInviteCbs = []; onRematchAcceptCbs = []; onRematchDeclineCbs = [];
    },
  };
}
