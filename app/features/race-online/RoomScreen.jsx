import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@app/ui/Icon.jsx';
import Modal from '@app/ui/Modal.jsx';
import { KeybindService } from '@shared/services/keybindService.js';
import { getPlayerId, getAccessToken } from '@game/net/supabase/auth.js';
import {
  fetchRoom, subscribeRoom, leaveRoom, touchRoom,
} from '@game/net/supabase/rooms.js';
import { supabase } from '@game/net/supabase/client.js';
import useTranslation from '@shared/i18n/useTranslation.js';
import { playLoopSfx, stopLoopSfx, playSfx } from '@shared/services/audioManager.js';

// Pantalla de matchmaking — muestra sala recien creada/joinada con estado
// "esperando rival". Cuando ambos jugadores estan presentes, llama
// onRivalFound(room, role) → MainMenu transiciona a OnlineRoomHangar (3D).
//
// Esta es la unica responsabilidad: detectar match. La seleccion de nave +
// ready toggle vive en OnlineRoomHangar (Fase B).
// La llegada del rival la empuja Realtime; este poll es solo red de seguridad
// por si la suscripcion se cae. Nada aqui es critico en tiempo — a diferencia
// del hangar, donde `status='starting'` arranca la carrera para ambos y el
// poll sigue a 2s a proposito.
const ROOM_POLL_MS = 8000;

export default function RoomScreen({ roomId, role, onLeave, onRivalFound }) {
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Id de jugador del servidor (plr_xxx), resuelto desde auth.uid() en
  // MainMenu. Solo se usa para comparar contra room.host_id / guest_id: las
  // RPC derivan la identidad del token, no de lo que mandemos.
  const myId = getPlayerId();

  // Load + suscribir + heartbeat anti-fantasma.
  useEffect(() => {
    let mounted = true;
    setBusy(true);
    const reload = () => fetchRoom(roomId, { playerId: myId })
      .then((r) => { if (mounted && r) setRoom(r); })
      .catch((e) => { if (mounted) setError(e?.message || t('race.lobby.errors.load')); });

    reload().finally(() => { if (mounted) setBusy(false); });

    // Realtime no emite `code` (revocada a nivel de columna) — preservar el
    // que trajo fetchRoom para que el host no lo pierda en el primer update.
    const unsub = subscribeRoom(roomId, (next) => {
      if (mounted && next) setRoom((prev) => ({ ...next, code: next.code ?? prev?.code ?? null }));
    });
    const pollId = setInterval(reload, ROOM_POLL_MS);
    touchRoom({ roomId }).catch(() => {});
    const beatId = setInterval(() => {
      touchRoom({ roomId }).catch(() => {});
    }, 30000);

    const onBeforeUnload = () => {
      try {
        const url   = `${supabase?.supabaseUrl || ''}/rest/v1/rpc/leave_race_room`;
        const key   = supabase?.supabaseKey;
        // leave_race_room exige rol authenticated: va el JWT de la sesion, no
        // la anon key. El servidor identifica al jugador desde el token.
        const token = getAccessToken();
        if (url && key && token) {
          fetch(url, {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type':  'application/json',
              'apikey':        key,
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ p_room_id: roomId }),
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);

    return () => {
      mounted = false;
      unsub();
      clearInterval(pollId);
      clearInterval(beatId);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
    };
  }, [roomId, myId]);

  // Auto-transicion a OnlineRoomHangar cuando ambos jugadores estan en sala.
  // Fire-once: triggeredRef bloquea re-runs. Antes el poll (2s) + subscribe
  // (realtime) generaban nuevos refs de `room` que cancelaban el setTimeout
  // antes de los 600ms → host quedaba pegado en "Cargando hangar...".
  const triggeredRef = useRef(false);
  const roomRef = useRef(null); roomRef.current = room;
  const onRivalFoundRef = useRef(onRivalFound); onRivalFoundRef.current = onRivalFound;
  useEffect(() => {
    if (triggeredRef.current) return;
    if (!room) return;
    if (room.status !== 'lobby') return;
    if (!room.host_id || !room.guest_id) return;
    triggeredRef.current = true;
    const t = setTimeout(() => {
      onRivalFoundRef.current?.(roomRef.current, role);
    }, 600);
    return () => clearTimeout(t);
  }, [room?.host_id, room?.guest_id, room?.status, role]);

  // SFX: loop esperando rival → al unirse, stop + ping rival.joined.
  const bothJoinedSfx = !!(room?.host_id && room?.guest_id);
  const prevBothJoinedRef = useRef(false);
  useEffect(() => {
    if (!room) return;
    if (bothJoinedSfx) {
      stopLoopSfx('waitingrival.loop');
      playSfx('rival.joined');
    } else {
      if (prevBothJoinedRef.current) playSfx('rival.left');
      playLoopSfx('waitingrival.loop', 0.5);
    }
    prevBothJoinedRef.current = bothJoinedSfx;
    return () => { stopLoopSfx('waitingrival.loop'); };
  }, [bothJoinedSfx, !!room]);

  const handleLeave = useCallback(async () => {
    setBusy(true);
    try { await leaveRoom({ roomId }); } catch { /* ignore */ }
    onLeave?.();
  }, [roomId, myId, onLeave]);

  // Modal scope: ESC sale de la sala.
  useEffect(() => {
    KeybindService.pushScope('modal');
    const off = KeybindService.register('modal', 'CANCEL', () => handleLeave());
    return () => { off(); KeybindService.popScope('modal'); };
  }, [handleLeave]);

  // autoFocus on Salir button.
  const leaveBtnRef = useRef(null);
  const didFocusRef = useRef(false);
  useEffect(() => {
    if (didFocusRef.current) return;
    if (leaveBtnRef.current) { leaveBtnRef.current.focus(); didFocusRef.current = true; }
  }, [room]);

  if (!room) {
    return (
      <Modal className="room" panelClassName="room__panel" onClose={handleLeave}>
        <div className="room__state">{error || (busy ? t('race.lobbyExtra.loadRoom') : t('race.lobbyExtra.noData'))}</div>
        <button type="button" className="room__btn" onClick={onLeave}>{t('race.lobbyExtra.backToLobby')}</button>
      </Modal>
    );
  }

  const bothJoined = !!(room.host_id && room.guest_id);

  return (
    <Modal
      className="room"
      panelClassName="room__panel room__panel--matchmaking"
      onClose={handleLeave}
      initialFocusRef={leaveBtnRef}
    >
      <header className="room__header">
        <span className="room__label">
          ◈ {t('race.hangar.salaLabel')} · {room.is_private ? `${t('race.room.private')} #${room.code}` : t('race.room.public')}
        </span>
        <button type="button" className="room__close" onClick={handleLeave} aria-label={t('keys.exit')}><Icon name="close" size={16} /></button>
      </header>

      <div className="room__matchmaking-body">
        <div className="room__matchmaking-spinner">
          <div className="room__matchmaking-ring" />
        </div>

        {!bothJoined && (
          <>
            <h2 className="room__matchmaking-title">{t('race.room.waiting')}</h2>
            <p className="room__matchmaking-sub">
              {room.is_private
                ? t('race.room.privateHint', { code: room.code })
                : t('race.room.publicHint')}
            </p>
          </>
        )}

        {bothJoined && (
          <>
            <h2 className="room__matchmaking-title room__matchmaking-title--ok">{t('race.room.found')}</h2>
            <p className="room__matchmaking-sub">{t('race.room.loadingHangar')}</p>
          </>
        )}
      </div>

      {error && <div className="room__error">{error}</div>}

      <div className="room__actions">
        <button ref={leaveBtnRef} type="button" className="room__btn room__btn--ghost" onClick={handleLeave}>
          {t('race.room.leave')}
        </button>
      </div>
    </Modal>
  );
}
