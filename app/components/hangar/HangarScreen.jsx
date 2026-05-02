import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShipSelectionScene } from '../../../game/scenes/ShipSelectionScene.js';
import { Bridge } from '../../../shared/bridge.js';
import { EventTypes } from '../../../shared/eventTypes.js';
import { SHIPS } from '../../../shared/constants.js';
import { getShipData } from '../../../game/data/shipData.js';
import ShipSelectLoadingScreen from '../ShipSelectLoadingScreen.jsx';
import HangarHeader from './HangarHeader.jsx';
import ShipInfo from './ShipInfo.jsx';
import HangarFrame from './HangarFrame.jsx';
import ShipStats from './ShipStats.jsx';
import ShipArsenal from './ShipArsenal.jsx';
import ShipNav from './ShipNav.jsx';
import HangarControls from './HangarControls.jsx';

const MIN_LOADING_MS = 1800;
const PROGRESS_TICK  = 80;
const PROGRESS_STEP  = 3.5;

export default function HangarScreen() {
  const mountRef   = useRef(null);
  const sceneRef   = useRef(null);
  const shipIdxRef = useRef(0);

  const [shipIdx,      setShipIdx]      = useState(0);
  const [canvasAlpha,  setCanvasAlpha]  = useState(1);
  const [autoRotate,   setAutoRotate]   = useState(true);
  const [phase,        setPhase]        = useState('loading');
  const [loadProgress, setLoadProgress] = useState(0);

  const sceneReadyRef = useRef(false);
  const minTimeRef    = useRef(false);
  const progressRef   = useRef(0);

  const tryReady = useCallback(() => {
    if (sceneReadyRef.current && minTimeRef.current) {
      setLoadProgress(100);
      setTimeout(() => setPhase('ready'), 300);
    }
  }, []);

  useEffect(() => {
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
      if (e.key === 'ArrowLeft')          navigateTo(shipIdxRef.current - 1);
      if (e.key === 'ArrowRight')         navigateTo(shipIdxRef.current + 1);
      if (e.key === 'r' || e.key === 'R') sceneRef.current?.resetOrbit();
      if (e.key === 'Home')               sceneRef.current?.setTopView();
      if (e.key === 'End')                sceneRef.current?.setBottomView();
      if (e.key === 'Enter')              handleConfirm();
      if (e.key === 'Escape')             handleCancel();
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

  const ship     = SHIPS[shipIdx];
  const shipData = getShipData(ship.id);

  return (
    <>
      <div style={{ visibility: phase === 'loading' ? 'hidden' : 'visible', position: 'absolute', inset: 0 }}>
        <div className="hangar">
          <div ref={mountRef} className="hangar__canvas" style={{ opacity: canvasAlpha }} />

          <HangarFrame />

          <HangarHeader ship={ship} />

          <ShipInfo ship={ship} coreId={shipData.coreId} />

          <ShipStats coreId={shipData.coreId} stats={shipData.stats} />

          <ShipArsenal arsenal={shipData.arsenal} />

          <ShipNav
            idx={shipIdx}
            total={SHIPS.length}
            onPrev={() => navigateTo(shipIdx - 1)}
            onNext={() => navigateTo(shipIdx + 1)}
          />

          <HangarControls
            autoRotate={autoRotate}
            onToggleRotate={toggleAutoRotate}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            idx={shipIdx}
            total={SHIPS.length}
          />
        </div>
      </div>

      {phase === 'loading' && <ShipSelectLoadingScreen progress={loadProgress} />}
    </>
  );
}
