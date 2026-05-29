import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ShipSelectionScene } from '@game/scenes/ShipSelectionScene.js';
import { Bridge } from '@shared/state/bridge.js';
import { EventTypes } from '@shared/state/eventTypes.js';
import { KeybindService } from '@shared/services/keybindService.js';
import { getShipsForHangar } from '@shared/data/shopCatalog.js';
import { playSfx, playBgm } from '@shared/services/audioManager.js';

const SHIPS = getShipsForHangar();
const PROGRESS_TICK = 80;
const PROGRESS_STEP = 3.5;
const HOLD_KEYS = new Set(['a', 'A', 'w', 'W', 's', 'S', 'd', 'D']);

// Logica de escena 3D compartida entre el hangar solo (HangarScreen) y el
// hangar de sala online (OnlineRoomHangar): montaje/dispose de la escena,
// barra de carga, inputs de orbita (teclado/raton) y navegacion entre naves.
//
// Lo especifico de cada modo entra por 5 seams (todos opcionales):
//   bgm          — pista a reproducir al montar
//   minLoadingMs — duracion minima de la pantalla de carga
//   canNavigate  — guard antes de cambiar de nave (online bloquea tras ready)
//   onNavigated  — efecto tras cambiar de nave (online: RPC debounced)
//   onSceneMount — trabajo extra al crear la escena, devuelve cleanup
//                  (solo: listeners de tutorial + preload de assets)
export function useHangarScene({
  bgm,
  minLoadingMs = 1800,
  canNavigate,
  onNavigated,
  onSceneMount,
} = {}) {
  const mountRef   = useRef(null);
  const sceneRef   = useRef(null);
  const shipIdxRef = useRef(0);

  const [shipIdx,      setShipIdx]      = useState(0);
  const [canvasAlpha,  setCanvasAlpha]  = useState(1);
  const [phase,        setPhase]        = useState('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const sceneReadyRef = useRef(false);
  const minTimeRef    = useRef(false);
  const progressRef   = useRef(0);

  // Refs a los callbacks-seam para que navigateTo y el efecto de montaje
  // permanezcan estables (sin re-suscribir listeners en cada render).
  const canNavigateRef  = useRef(canNavigate);
  const onNavigatedRef  = useRef(onNavigated);
  const onSceneMountRef = useRef(onSceneMount);
  canNavigateRef.current  = canNavigate;
  onNavigatedRef.current  = onNavigated;
  onSceneMountRef.current = onSceneMount;

  const tryReady = useCallback(() => {
    if (sceneReadyRef.current && minTimeRef.current) {
      setLoadProgress(100);
      setTimeout(() => setPhase('ready'), 300);
    }
  }, []);

  useEffect(() => { if (bgm) playBgm(bgm); }, [bgm]);

  // Montaje de escena + progreso de carga + dispose.
  useEffect(() => {
    const tickId = setInterval(() => {
      progressRef.current = Math.min(90, progressRef.current + PROGRESS_STEP);
      setLoadProgress(progressRef.current);
    }, PROGRESS_TICK);

    const minTimer = setTimeout(() => {
      minTimeRef.current = true;
      tryReady();
    }, minLoadingMs);

    const scene = new ShipSelectionScene(mountRef.current, {
      onLoadStart: () => {},
      onLoadEnd: () => {
        clearInterval(tickId);
        progressRef.current = 90;
        setLoadProgress(90);
        sceneReadyRef.current = true;
        tryReady();
      },
    });
    sceneRef.current = scene;
    scene.loadShip(0);
    Bridge.emit(EventTypes.SHIP_SELECTION_OPENED, {});

    const extraCleanup = onSceneMountRef.current?.(scene);

    return () => {
      clearInterval(tickId);
      clearTimeout(minTimer);
      if (typeof extraCleanup === 'function') extraCleanup();
      scene.destroy();
      sceneRef.current = null;
    };
  }, [tryReady, minLoadingMs]);

  // Re-render cuando cambia el estado del Bridge.
  useEffect(() => Bridge.onStateChange(() => forceUpdate()), []);

  // HANGAR_FIRE = K hold (auto-fire mientras presionado). KeybindService es
  // discreto → manejamos hold con keydown/keyup directos.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (KeybindService.getTopScope() !== 'hangar') return;
      if ((e.key === 'k' || e.key === 'K') && !e.repeat) sceneRef.current?.startAutoFire?.();
    };
    const onKeyUp = (e) => {
      if (KeybindService.getTopScope() !== 'hangar') return;
      if (e.key === 'k' || e.key === 'K') sceneRef.current?.stopAutoFire?.();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // WASD hold para mover camara orbital. Listener separado del service
  // porque son teclas continuas (hold), no acciones discretas.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (KeybindService.getTopScope() !== 'hangar') return;
      if (HOLD_KEYS.has(e.key)) {
        if (!e.repeat) playSfx('hangarcamera.orbit');
        sceneRef.current?.addKey(e.key);
      }
    };
    const onKeyUp = (e) => {
      if (KeybindService.getTopScope() !== 'hangar') return;
      if (HOLD_KEYS.has(e.key)) sceneRef.current?.removeKey(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // Mouse drag / wheel para orbital.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const onMouseDown = (e) => sceneRef.current?.startDrag(e.clientX, e.clientY);
    const onMouseMove = (e) => sceneRef.current?.drag(e.clientX, e.clientY);
    const onMouseUp   = ()  => sceneRef.current?.endDrag();
    const onWheel     = (e) => { e.preventDefault(); sceneRef.current?.zoom(e.deltaY); };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    mount.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      mount.removeEventListener('wheel', onWheel);
    };
  }, []);

  const navigateTo = useCallback((newIdx) => {
    if (canNavigateRef.current && !canNavigateRef.current()) return;
    const clamped = ((newIdx % SHIPS.length) + SHIPS.length) % SHIPS.length;
    setCanvasAlpha(0);
    setTimeout(() => {
      if (!sceneRef.current) return;
      shipIdxRef.current = clamped;
      setShipIdx(clamped);
      sceneRef.current.loadShip(clamped);
      Bridge.emit(EventTypes.SHIP_FOCUS_CHANGED, { shipId: SHIPS[clamped].id });
      setCanvasAlpha(1);
      onNavigatedRef.current?.(clamped);
    }, 180);
  }, []);

  return {
    mountRef,
    sceneRef,
    shipIdx,
    setShipIdx,
    shipIdxRef,
    canvasAlpha,
    phase,
    loadProgress,
    navigateTo,
    forceUpdate,
  };
}
