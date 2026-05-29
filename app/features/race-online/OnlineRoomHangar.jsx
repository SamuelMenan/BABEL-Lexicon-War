import React, { useEffect, useRef, useState } from 'react';
import { Bridge } from '@shared/state/bridge.js';
import { KeybindService } from '@shared/services/keybindService.js';
import { getShipsForHangar } from '@shared/data/shopCatalog.js';
import { EconomySystem } from '@game/domains/economy/EconomySystem.js';
import { loadProfile } from '@shared/services/playerProfile.js';
import { getShipData } from '@game/data/shipData.js';
import { getCharacter } from '@shared/data/characterData.js';
import useTranslation from '@shared/i18n/useTranslation.js';

import {
  fetchRoom, subscribeRoom, setRoomShip, setRoomReady, leaveRoom, touchRoom,
} from '@game/net/supabase/rooms.js';
import { supabase } from '@game/net/supabase/client.js';

import { useHangarScene } from '../hangar/useHangarScene.js';
import HangarShell from '../hangar/HangarShell.jsx';
import HangarHeader from '../hangar/HangarHeader.jsx';
import ShipInfo from '../hangar/ShipInfo.jsx';
import ShipStats from '../hangar/ShipStats.jsx';
import ShipArsenal from '../hangar/ShipArsenal.jsx';
import ShipNav from '../hangar/ShipNav.jsx';

import OnlineHangarControls from './OnlineHangarControls.jsx';
import OnlinePilotBadge from './OnlinePilotBadge.jsx';
import OnlineRivalLeftModal from './OnlineRivalLeftModal.jsx';

const SHIPS = getShipsForHangar();
const DEFAULT_HOST_SHIP  = 'spaceship';
const DEFAULT_GUEST_SHIP = 'spaceshipnew';
const PICK_DEBOUNCE_MS = 350;
const HEARTBEAT_MS = 30000;

// Vista 3D estilo hangar para salas online — usuario ve nave en 3D, navega
// con flechas, ve piloto asignado, escoge nave (RPC), marca listo. Cuando
// ambos listos, status='starting' dispara deploy animation + onMatchStart.
//
// La logica de escena/carga/inputs/navegacion vive en useHangarScene; aqui
// queda solo lo especifico de online: room sync, slots host/guest, RPCs,
// ready/leave y deteccion de abandono.
export default function OnlineRoomHangar({ roomId, role, onLeave, onMatchStart }) {
  const { t } = useTranslation();
  const profile = loadProfile();
  const myId    = profile.playerId;

  const [room,        setRoom]        = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [rivalLeft,   setRivalLeft]   = useState(false);
  const [pickError,   setPickError]   = useState(null);

  const deployingRef      = useRef(false);
  const onMatchStartedRef = useRef(false);  // guard contra trigger doble
  const pickTimerRef      = useRef(null);
  const hadGuestRef       = useRef(false);   // tracking abandono guest
  const initShipAttemptRef = useRef(false);

  // ──────────────────────────────────────────────────────────────────────
  // Derivar slots host/guest desde room state
  // ──────────────────────────────────────────────────────────────────────
  const myShip      = role === 'host' ? room?.host_ship   : room?.guest_ship;
  const otherShip   = role === 'host' ? room?.guest_ship  : room?.host_ship;
  const myReady     = role === 'host' ? !!room?.host_ready  : !!room?.guest_ready;
  const otherReady  = role === 'host' ? !!room?.guest_ready : !!room?.host_ready;
  const myPilot     = role === 'host' ? room?.host_pilot  : room?.guest_pilot;
  const otherPilot  = role === 'host' ? room?.guest_pilot : room?.host_pilot;
  const status      = room?.status ?? 'lobby';
  const guestId     = room?.guest_id ?? null;
  const hostId      = room?.host_id ?? null;
  const otherJoined = role === 'host' ? !!guestId : !!hostId;

  // ──────────────────────────────────────────────────────────────────────
  // Escena 3D + carga + inputs + navegacion (compartido con HangarScreen).
  // Seams online: bloquear nav tras ready/deploy + sync RPC debounced.
  // ──────────────────────────────────────────────────────────────────────
  const {
    mountRef, sceneRef, shipIdx, setShipIdx, shipIdxRef, canvasAlpha,
    phase, loadProgress, navigateTo,
  } = useHangarScene({
    bgm: 'bgm.lobby',
    minLoadingMs: 1200,
    canNavigate: () => !myReady && !deployingRef.current,
    onNavigated: (clamped) => {
      // Debounced sync: RPC setRoomShip si nave libre. Si rival la tiene,
      // rollback + mostrar toast.
      if (pickTimerRef.current) clearTimeout(pickTimerRef.current);
      pickTimerRef.current = setTimeout(async () => {
        const shipId = SHIPS[clamped].id;
        try {
          await setRoomShip({ roomId, playerId: myId, shipId });
          setPickError(null);
        } catch (e) {
          setPickError(e?.message || t('race.hangarExtra.shipUnavailable'));
          setTimeout(() => setPickError(null), 2500);
        }
      }, PICK_DEBOUNCE_MS);
    },
  });

  // ──────────────────────────────────────────────────────────────────────
  // Room sync: fetch inicial + subscribe + poll + heartbeat + beforeunload
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const reload = () => fetchRoom(roomId)
      .then((r) => { if (mounted && r) setRoom(r); })
      .catch(() => {});

    reload();
    const unsub = subscribeRoom(roomId, (next) => {
      if (mounted && next) setRoom(next);
    });
    const pollId = setInterval(reload, 2000);
    touchRoom({ roomId, playerId: myId }).catch(() => {});
    const beatId = setInterval(() => {
      touchRoom({ roomId, playerId: myId }).catch(() => {});
    }, HEARTBEAT_MS);

    const onBeforeUnload = () => {
      try {
        const url = `${supabase?.supabaseUrl || ''}/rest/v1/rpc/leave_race_room`;
        const key = supabase?.supabaseKey;
        if (url && key) {
          fetch(url, {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type':  'application/json',
              'apikey':        key,
              'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({ p_room_id: roomId, p_player_id: myId }),
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

  // ──────────────────────────────────────────────────────────────────────
  // Asignacion inicial de nave (evita conflicto host/guest en la primera carga)
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    initShipAttemptRef.current = false;
  }, [roomId, role]);

  useEffect(() => {
    if (!room || status !== 'lobby') return;
    if (myShip || initShipAttemptRef.current) return;

    let preferred = role === 'host' ? DEFAULT_HOST_SHIP : DEFAULT_GUEST_SHIP;
    if (!SHIPS.some(s => s.id === preferred)) {
      preferred = SHIPS[0]?.id;
    }
    if (!preferred) return;
    if (otherShip && preferred === otherShip) {
      const fallback = SHIPS.find(s => s.id !== otherShip)?.id;
      if (fallback) preferred = fallback;
    }

    initShipAttemptRef.current = true;
    setRoomShip({ roomId, playerId: myId, shipId: preferred })
      .catch(() => { initShipAttemptRef.current = false; });
  }, [room, status, myShip, otherShip, role, roomId, myId]);

  // Sync UI con la nave asignada en room (por defecto o por seleccion previa).
  useEffect(() => {
    if (!myShip || deployingRef.current) return;
    const idx = SHIPS.findIndex(s => s.id === myShip);
    if (idx >= 0 && idx !== shipIdxRef.current) {
      shipIdxRef.current = idx;
      setShipIdx(idx);
      sceneRef.current?.loadShip(idx);
    }
  }, [myShip]);

  // ──────────────────────────────────────────────────────────────────────
  // Detectar abandono del rival
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    // Host abandono → status='cancelled' (guest ve modal)
    if (role === 'guest' && status === 'cancelled') {
      setRivalLeft(true);
      return;
    }
    // Guest abandono → host ve guest_id pasar de set a null
    if (role === 'host') {
      if (guestId) hadGuestRef.current = true;
      else if (hadGuestRef.current && !guestId && status === 'lobby') {
        setRivalLeft(true);
      }
    }
  }, [room, status, guestId, role]);

  // ──────────────────────────────────────────────────────────────────────
  // status='starting' → trigger deploy animation + onMatchStart
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'starting' || onMatchStartedRef.current || !room) return;
    onMatchStartedRef.current = true;
    deployingRef.current = true;
    (async () => {
      try {
        // Asegurar que el ship cargado en scene es el del jugador (no el de nav residual).
        const myShipIdx = SHIPS.findIndex(s => s.id === myShip);
        if (myShipIdx >= 0 && myShipIdx !== shipIdxRef.current) {
          shipIdxRef.current = myShipIdx;
          setShipIdx(myShipIdx);
          sceneRef.current?.loadShip(myShipIdx);
          // Espera breve para que el modelo cargue antes del deploy.
          await new Promise(r => setTimeout(r, 250));
        }
        Bridge.setState({ deploymentPhase: 'landing' });
        await sceneRef.current?.triggerDeployment();
      } catch (e) { console.warn('[OnlineRoomHangar] deploy falla', e); }
      onMatchStart?.(room);
    })();
  }, [status, room, myShip, onMatchStart]);

  // Activa scope 'hangar' via Bridge flag — App.jsx lee onlineHangarActive
  // y llama setScope('hangar') en cada onStateChange. PushScope no funciona
  // porque App.jsx sobrescribe el top en cada state change.
  useEffect(() => {
    Bridge.setState({ onlineHangarActive: true });
    KeybindService.setScope('hangar');
    return () => {
      Bridge.setState({ onlineHangarActive: false });
      KeybindService.setScope('menu');
    };
  }, []);

  // Keybinds (scope 'hangar') — paridad con HangarScreen single + ready/leave.
  useEffect(() => {
    const offs = [
      KeybindService.register('hangar', 'NAV_PREV', () => navigateTo(shipIdxRef.current - 1)),
      KeybindService.register('hangar', 'NAV_NEXT', () => navigateTo(shipIdxRef.current + 1)),
      KeybindService.register('hangar', 'HANGAR_CAM_RESET', () => sceneRef.current?.resetOrbit()),
      KeybindService.register('hangar', 'HANGAR_CAM_CYCLE', () => sceneRef.current?.cycleCameraView()),
      KeybindService.register('hangar', 'HANGAR_LASER',     () => sceneRef.current?.toggleLaser?.()),
      KeybindService.register('hangar', 'HANGAR_BOOSTERS',  () => sceneRef.current?.toggleFlowSim?.()),
      KeybindService.register('hangar', 'HANGAR_DETONATE',  () => sceneRef.current?.detonateCurrentShip?.()),
      KeybindService.register('hangar', 'CONFIRM', () => handleToggleReady()),
      KeybindService.register('hangar', 'CANCEL',  () => handleLeave()),
    ];
    return () => offs.forEach(fn => fn());
  }, [navigateTo, myReady, myShip, roomId, myId]);

  // ──────────────────────────────────────────────────────────────────────
  // Acciones
  // ──────────────────────────────────────────────────────────────────────
  async function handleToggleReady() {
    if (!myShip || deployingRef.current) return;
    try {
      await setRoomReady({ roomId, playerId: myId, ready: !myReady });
    } catch (e) {
      setPickError(e?.message || t('race.hangarExtra.readyError'));
      setTimeout(() => setPickError(null), 2500);
    }
  }

  async function handleLeave() {
    if (deployingRef.current) return;
    try { await leaveRoom({ roomId, playerId: myId }); } catch { /* ignore */ }
    onLeave?.();
  }

  function handleRivalLeftDismiss() {
    setRivalLeft(false);
    handleLeave();
  }

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  const ship     = SHIPS[shipIdx];
  const shipData = getShipData(ship.id);

  return (
    <>
      <HangarShell phase={phase} loadProgress={loadProgress} canvasAlpha={canvasAlpha} mountRef={mountRef}>
            <HangarHeader
              ship={ship}
              character={getCharacter(myPilot || EconomySystem.getSelectedCharacter())}
              rivalCharacter={otherPilot ? getCharacter(otherPilot) : null}
            />

            <OnlinePilotBadge
              myPilot={myPilot}
              rivalPilot={otherPilot}
              showWelcome={showWelcome && otherJoined}
              onDismiss={() => setShowWelcome(false)}
            />

            <ShipInfo
              ship={ship}
              coreId={shipData.coreId}
              owned={true}
              equipped={ship.id === myShip}
              price={ship.price}
            />

            <ShipStats coreId={shipData.coreId} stats={shipData.stats} />
            <ShipArsenal arsenal={shipData.arsenal} />

            <ShipNav
              idx={shipIdx}
              total={SHIPS.length}
              onPrev={() => navigateTo(shipIdx - 1)}
              onNext={() => navigateTo(shipIdx + 1)}
            />

            {otherShip && ship?.id === otherShip && (
              <div className="online-rival-ship-tag">{t('race.hangar.shipBlocked')}</div>
            )}

            <OnlineHangarControls
              myShip={myShip}
              myReady={myReady}
              otherReady={otherReady}
              status={status}
              roomCode={room?.code || null}
              connection={otherJoined ? 'connected' : 'connecting'}
              onToggleReady={handleToggleReady}
              onLeave={handleLeave}
            />

            {pickError && (
              <div className="online-pick-error">{pickError}</div>
            )}
      </HangarShell>

      <OnlineRivalLeftModal open={rivalLeft} onClose={handleRivalLeftDismiss} />
    </>
  );
}
