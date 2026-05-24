import React, { useCallback, useEffect, useState } from 'react';
import { loadProfile } from '../../../../shared/playerProfile.js';
import { getShipsForHangar } from '../../../../shared/shopCatalog.js';
import {
  fetchRoom, subscribeRoom, setRoomShip, setRoomReady, leaveRoom,
} from '../../../services/supabase/rooms.js';

// Sala pre-carrera. Cada jugador escoge nave (no la misma que el rival)
// y marca ready. Cuando ambos ready + status='starting' → onMatchStart(room).
// Fase 1: no arranca la carrera todavia. Solo deja la sala lista.
export default function RoomScreen({ roomId, role, onLeave, onMatchStart }) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const profile = loadProfile();
  const myId = profile.playerId;
  const ships = getShipsForHangar();

  // Load + suscribir + poll fallback.
  useEffect(() => {
    let mounted = true;
    setBusy(true);
    const reload = () => fetchRoom(roomId)
      .then((r) => { if (mounted && r) setRoom(r); })
      .catch((e) => { if (mounted) setError(e?.message || 'No se pudo cargar sala'); });

    reload().finally(() => { if (mounted) setBusy(false); });

    const unsub = subscribeRoom(roomId, (next) => {
      if (!mounted) return;
      if (next) setRoom(next);
    });
    // Poll fallback — Realtime puede no estar habilitado o perder eventos.
    const pollId = setInterval(reload, 2000);
    return () => { mounted = false; unsub(); clearInterval(pollId); };
  }, [roomId]);

  // Disparar onMatchStart cuando ambos listos + status starting (fase 2).
  useEffect(() => {
    if (room?.status === 'starting') onMatchStart?.(room);
  }, [room?.status, onMatchStart, room]);

  const handleLeave = useCallback(async () => {
    setBusy(true);
    try {
      await leaveRoom({ roomId, playerId: myId });
    } catch { /* ignore */ }
    onLeave?.();
  }, [roomId, myId, onLeave]);

  const handlePickShip = async (shipId) => {
    setError('');
    try {
      await setRoomShip({ roomId, playerId: myId, shipId });
    } catch (e) {
      setError(e?.message || 'Nave no disponible');
    }
  };

  const handleToggleReady = async () => {
    if (!room) return;
    const currentReady = role === 'host' ? room.host_ready : room.guest_ready;
    setError('');
    try {
      await setRoomReady({ roomId, playerId: myId, ready: !currentReady });
    } catch (e) {
      setError(e?.message || 'No se pudo marcar ready');
    }
  };

  if (!room) {
    return (
      <div className="room" role="dialog" aria-modal="true">
        <div className="room__panel">
          <div className="room__state">{error || (busy ? 'Cargando sala...' : 'Sin datos')}</div>
          <button className="room__btn" onClick={onLeave}>Volver al lobby</button>
        </div>
      </div>
    );
  }

  const myShip       = role === 'host' ? room.host_ship   : room.guest_ship;
  const otherShip    = role === 'host' ? room.guest_ship  : room.host_ship;
  const myReady      = role === 'host' ? room.host_ready  : room.guest_ready;
  const otherReady   = role === 'host' ? room.guest_ready : room.host_ready;
  const myPilot      = role === 'host' ? room.host_pilot  : room.guest_pilot;
  const otherPilot   = role === 'host' ? room.guest_pilot : room.host_pilot;
  const otherJoined  = role === 'host' ? !!room.guest_id  : !!room.host_id;

  return (
    <div className="room" role="dialog" aria-modal="true">
      <div className="room__panel">
        <header className="room__header">
          <span className="room__label">
            ◈ SALA · {room.is_private ? `PRIVADA #${room.code}` : 'PUBLICA'}
          </span>
          <button type="button" className="room__close" onClick={handleLeave} aria-label="Salir">✕</button>
        </header>

        <div className="room__slots">
          <SlotCard
            title={role === 'host' ? 'TU' : 'HOST'}
            pilot={role === 'host' ? myPilot : otherPilot}
            ship={role === 'host' ? myShip : otherShip}
            ready={role === 'host' ? myReady : otherReady}
            joined
            ships={ships}
          />
          <SlotCard
            title={role === 'host' ? 'INVITADO' : 'TU'}
            pilot={role === 'host' ? otherPilot : myPilot}
            ship={role === 'host' ? otherShip : myShip}
            ready={role === 'host' ? otherReady : myReady}
            joined={role === 'host' ? otherJoined : true}
            ships={ships}
          />
        </div>

        <h3 className="room__section-title">ELIGE TU NAVE</h3>
        <div className="room__ship-grid">
          {ships.map((s) => {
            const taken    = otherShip === s.id;
            const selected = myShip === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={
                  `room__ship${selected ? ' room__ship--selected' : ''}${taken ? ' room__ship--taken' : ''}`
                }
                onClick={() => !taken && handlePickShip(s.id)}
                disabled={taken || myReady}
                title={taken ? 'Tomada por el rival' : s.name}
              >
                <span className="room__ship-name">{s.name}</span>
                <span className="room__ship-code">{s.code}</span>
                {taken && <span className="room__ship-badge">RIVAL</span>}
                {selected && <span className="room__ship-badge room__ship-badge--ok">TU</span>}
              </button>
            );
          })}
        </div>

        {error && <div className="room__error">{error}</div>}

        <div className="room__actions">
          <button
            type="button"
            className={`room__btn room__btn--primary${myReady ? ' room__btn--active' : ''}`}
            onClick={handleToggleReady}
            disabled={!myShip}
          >
            {myReady ? '✔ LISTO' : 'MARCAR LISTO'}
          </button>
          <button type="button" className="room__btn room__btn--ghost" onClick={handleLeave}>
            Salir de sala
          </button>
        </div>

        <p className="room__hint">
          {!otherJoined && 'Esperando rival...'}
          {otherJoined && (!myShip || !otherShip) && 'Esperando seleccion de naves...'}
          {otherJoined && myShip && otherShip && (!myReady || !otherReady) && 'Marquen LISTO para iniciar.'}
          {myReady && otherReady && 'Iniciando carrera...'}
        </p>
      </div>
    </div>
  );
}

function SlotCard({ title, pilot, ship, ready, joined, ships }) {
  const shipInfo = ships.find(s => s.id === ship);
  return (
    <div className={`room__slot${joined ? '' : ' room__slot--empty'}`}>
      <div className="room__slot-title">{title}</div>
      <div className="room__slot-pilot">{(pilot || '—').toUpperCase()}</div>
      <div className="room__slot-ship">{shipInfo?.name || (joined ? 'eligiendo...' : 'esperando rival')}</div>
      <div className={`room__slot-ready${ready ? ' room__slot-ready--ok' : ''}`}>
        {ready ? '● LISTO' : '○ no listo'}
      </div>
    </div>
  );
}
