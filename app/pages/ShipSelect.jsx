import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShipSelectionScene } from '../../game/scenes/ShipSelectionScene.js';
import { Bridge } from '../../shared/bridge.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { SHIPS } from '../../shared/constants.js';
import ShipSelectLoadingScreen from '../components/ShipSelectLoadingScreen.jsx';

const MIN_LOADING_MS  = 1800;
const PROGRESS_TICK   = 80;   // ms between progress increments
const PROGRESS_STEP   = 3.5;  // % per tick while simulating

export default function ShipSelect() {
  const mountRef   = useRef(null);
  const sceneRef   = useRef(null);
  const shipIdxRef = useRef(0);

  const [shipIdx,      setShipIdx]      = useState(0);
  const [canvasAlpha,  setCanvasAlpha]  = useState(1);
  const [autoRotate,   setAutoRotate]   = useState(true);

  // Loading phase state
  const [phase,         setPhase]         = useState('loading'); // 'loading' | 'ready'
  const [loadProgress,  setLoadProgress]  = useState(0);
  const sceneReadyRef   = useRef(false);
  const minTimeRef      = useRef(false);
  const progressRef     = useRef(0);

  // Advance to 'ready' only when both scene loaded and min time elapsed
  const tryReady = useCallback(() => {
    if (sceneReadyRef.current && minTimeRef.current) {
      setLoadProgress(100);
      setTimeout(() => setPhase('ready'), 300);
    }
  }, []);

  useEffect(() => {
    // Simulate progress up to 90%; scene load pushes it to 100
    const tickId = setInterval(() => {
      progressRef.current = Math.min(90, progressRef.current + PROGRESS_STEP);
      setLoadProgress(progressRef.current);
    }, PROGRESS_TICK);

    const minTimer = setTimeout(() => {
      minTimeRef.current = true;
      tryReady();
    }, MIN_LOADING_MS);

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

    return () => {
      clearInterval(tickId);
      clearTimeout(minTimer);
      scene.destroy();
      sceneRef.current = null;
    };
  }, [tryReady]);

  const navigateTo = useCallback((newIdx) => {
    const clamped = ((newIdx % SHIPS.length) + SHIPS.length) % SHIPS.length;
    setCanvasAlpha(0);
    setTimeout(() => {
      if (!sceneRef.current) return;
      shipIdxRef.current = clamped;
      setShipIdx(clamped);
      sceneRef.current.loadShip(clamped);
      Bridge.emit(EventTypes.SHIP_FOCUS_CHANGED, { shipId: SHIPS[clamped].id });
      setCanvasAlpha(1);
    }, 180);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      sceneRef.current?.addKey(e.key);
      if (e.key === 'ArrowLeft')  navigateTo(shipIdxRef.current - 1);
      if (e.key === 'ArrowRight') navigateTo(shipIdxRef.current + 1);
      if (e.key === 'r' || e.key === 'R') sceneRef.current?.resetOrbit();
      if (e.key === 'Enter')  handleConfirm();
      if (e.key === 'Escape') handleCancel();
    }
    function onKeyUp(e) { sceneRef.current?.removeKey(e.key); }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, [navigateTo]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    function onMouseDown(e) { sceneRef.current?.startDrag(e.clientX, e.clientY); }
    function onMouseMove(e) { sceneRef.current?.drag(e.clientX, e.clientY); }
    function onMouseUp()    { sceneRef.current?.endDrag(); }
    function onWheel(e)     { e.preventDefault(); sceneRef.current?.zoom(e.deltaY); }
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

  function handleConfirm() { Bridge.commands.confirmShip(SHIPS[shipIdxRef.current].id); }
  function handleCancel()  { Bridge.commands.cancelShipSelection(); }

  function toggleAutoRotate() {
    const next = !autoRotate;
    setAutoRotate(next);
    sceneRef.current?.setAutoRotate(next);
  }

  const ship = SHIPS[shipIdx];

  return (
    <>
      {/* Scene mounts in background during loading so Three.js can initialize */}
      <div style={{ visibility: phase === 'loading' ? 'hidden' : 'visible', position: 'absolute', inset: 0 }}>
        <div className="ship-select">
          <div ref={mountRef} className="ship-select__canvas" style={{ opacity: canvasAlpha }} />

          <div className="ship-select__info">
            <p className="ship-select__code">{ship.code}</p>
            <h2 className="ship-select__name">{ship.name}</h2>
            <p className="ship-select__class">Programa TYPO · Unidad no clasificada</p>
          </div>

          <button className="ship-select__nav-btn ship-select__nav-btn--left" onClick={() => navigateTo(shipIdx - 1)}>&#60;</button>
          <button className="ship-select__nav-btn ship-select__nav-btn--right" onClick={() => navigateTo(shipIdx + 1)}>&#62;</button>

          <div className="ship-select__bottom-hud">
            <p className="ship-select__pos-indicator">{shipIdx + 1} / {SHIPS.length}</p>
            <div className="ship-select__btn-row">
              <button className="ship-select__toggle-btn" onClick={toggleAutoRotate}>
                {autoRotate ? 'DETENER GIRO' : 'INICIAR GIRO'}
              </button>
              <button className="ship-select__cancel-btn" onClick={handleCancel}>VOLVER</button>
              <button className="ship-select__confirm-btn" onClick={handleConfirm}>DESPLEGAR NAVE</button>
            </div>
            <p className="ship-select__key-hints">&#8592; &#8594; CAMBIAR &middot; A/D ROTAR &middot; W/S ZOOM &middot; R REINICIAR &middot; ENTER CONFIRMAR</p>
          </div>
        </div>
      </div>

      {phase === 'loading' && <ShipSelectLoadingScreen progress={loadProgress} />}
    </>
  );
}
