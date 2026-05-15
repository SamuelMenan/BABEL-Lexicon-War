import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShipSelectionScene } from '../../../game/scenes/ShipSelectionScene.js';
import { Bridge } from '../../../shared/bridge.js';
import { EventTypes } from '../../../shared/eventTypes.js';
import { getShipsForHangar } from '../../../shared/shopCatalog.js';
import { EconomySystem } from '../../../game/systems/EconomySystem.js';

const SHIPS = getShipsForHangar();
import { getShipData } from '../../../game/data/shipData.js';
import ShipSelectLoadingScreen from '../ShipSelectLoadingScreen.jsx';
import HangarHeader from './HangarHeader.jsx';
import ShipInfo from './ShipInfo.jsx';
import HangarFrame from './HangarFrame.jsx';
import ShipStats from './ShipStats.jsx';
import ShipArsenal from './ShipArsenal.jsx';
import ShipNav from './ShipNav.jsx';
import HangarControls from './HangarControls.jsx';
import PurchaseModal from './PurchaseModal.jsx';

const MIN_LOADING_MS = 1800;
const PROGRESS_TICK  = 80;
const PROGRESS_STEP  = 3.5;

const RESERVED_KEYS = new Set([
  'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown',
  'Pause', 'Delete', 'Enter', 'Escape',
  'k', 'K', 'l', 'L', // K = auto-fire hold, L = laser toggle
  'j', 'J',           // J = toggle flow simulation en boosters
]);
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph']);
const PREVENT_DEFAULT_KEYS = new Set(['Tab', ' ', 'Spacebar']);

function isFireKey(e) {
  if (e.repeat) return false;
  const k = e.key;
  if (!k) return false;
  if (RESERVED_KEYS.has(k)) return false;
  if (MODIFIER_KEYS.has(k)) return false;
  if (k.length === 1 && /[a-zA-Z]/.test(k)) return false;
  return true;
}

export default function HangarScreen() {
  const mountRef   = useRef(null);
  const sceneRef   = useRef(null);
  const shipIdxRef = useRef(0);

  const [shipIdx,       setShipIdx]      = useState(0);
  const [walletTick,    setWalletTick]   = useState(0); // re-render al cambiar saldo/inventario
  const [pendingBuy,    setPendingBuy]   = useState(false);
  const [canvasAlpha,  setCanvasAlpha]  = useState(1);
  const [autoRotate,   setAutoRotate]   = useState(true);
  const [phase,        setPhase]        = useState('loading');
  const [loadProgress, setLoadProgress] = useState(0);

  const sceneReadyRef  = useRef(false);
  const minTimeRef     = useRef(false);
  const progressRef    = useRef(0);
  const deployingRef   = useRef(false);

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

    // PRELOAD COMBAT ASSETS WHILE IN HANGAR
    import('../../../game/core/AssetLoader.js').then(({ AssetLoader }) => {
      AssetLoader.preload('combat').catch(err => console.error("Preload error:", err));
    });

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
      if (e.key === 'PageUp')             sceneRef.current?.setRearView();
      if (e.key === 'PageDown')           sceneRef.current?.setSideView();
      if (e.key === 'Pause')              sceneRef.current?.toggleDebugMarkers();
      if (e.key === 'Delete')             sceneRef.current?.detonateCurrentShip();
      if (e.key === 'Enter') {
        const sid = SHIPS[shipIdxRef.current].id;
        if (!EconomySystem.ownsShip(sid)) {
          if (EconomySystem.canAfford(sid)) handlePurchase();
        } else if (EconomySystem.getEquippedShip() !== sid) {
          handleEquip();
        } else {
          handleConfirm();
        }
      }
      if (e.key === 'Escape' && !e.__babelPauseToggle) handleCancel();
      if ((e.key === 'k' || e.key === 'K') && !e.repeat) sceneRef.current?.startAutoFire();
      if ((e.key === 'l' || e.key === 'L') && !e.repeat) sceneRef.current?.toggleLaser();
      if ((e.key === 'j' || e.key === 'J') && !e.repeat) sceneRef.current?.toggleFlowSim();
      if (isFireKey(e)) {
        if (PREVENT_DEFAULT_KEYS.has(e.key) || /^F\d{1,2}$/.test(e.key)) {
          e.preventDefault();
        }
        sceneRef.current?.fireWeapon();
      }
    }
    function onKeyUp(e) {
      sceneRef.current?.removeKey(e.key);
      if (e.key === 'k' || e.key === 'K') sceneRef.current?.stopAutoFire();
    }

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

  async function handleConfirm() {
    if (deployingRef.current) return;
    const shipId = SHIPS[shipIdxRef.current].id;
    if (!EconomySystem.ownsShip(shipId)) return; // bloqueo: no poseída
    if (EconomySystem.getEquippedShip() !== shipId) EconomySystem.equipShip(shipId);
    deployingRef.current = true;
    const scene = sceneRef.current;
    if (scene) {
      await scene.triggerDeployment();
    }
    Bridge.commands.confirmShip(shipId);
  }
  function handleCancel()  { Bridge.commands.cancelShipSelection(); }

  function handlePurchase() {
    const shipId = SHIPS[shipIdxRef.current].id;
    if (!EconomySystem.canAfford(shipId)) return;
    setPendingBuy(true);
  }
  function confirmPurchase() {
    const shipId = SHIPS[shipIdxRef.current].id;
    const res = EconomySystem.purchaseShip(shipId);
    if (res.ok) setWalletTick(t => t + 1);
    setPendingBuy(false);
  }
  function cancelPurchase() { setPendingBuy(false); }
  function handleEquip() {
    const shipId = SHIPS[shipIdxRef.current].id;
    const res = EconomySystem.equipShip(shipId);
    if (res.ok) setWalletTick(t => t + 1);
  }

  useEffect(() => {
    return Bridge.onStateChange(() => setWalletTick(t => t + 1));
  }, []);

  function toggleAutoRotate() {
    const next = !autoRotate;
    setAutoRotate(next);
    sceneRef.current?.setAutoRotate(next);
  }

  const ship     = SHIPS[shipIdx];
  const shipData = getShipData(ship.id);
  const owned    = EconomySystem.ownsShip(ship.id);
  const equipped = EconomySystem.getEquippedShip() === ship.id;
  const canBuy   = !owned && EconomySystem.canAfford(ship.id);
  const grafemas = EconomySystem.getGrafemas();
  const missing  = !owned ? Math.max(0, (ship.price ?? 0) - grafemas) : 0;
  void walletTick;

  return (
    <>
      <div style={{ visibility: phase === 'loading' ? 'hidden' : 'visible', position: 'absolute', inset: 0 }}>
        <div className="hangar">
          <div ref={mountRef} className="hangar__canvas" style={{ opacity: canvasAlpha }} />

          <HangarFrame />

          <div className="hud-safe-zone">
          <HangarHeader ship={ship} />

          <ShipInfo ship={ship} coreId={shipData.coreId} owned={owned} equipped={equipped} price={ship.price} />

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
            onPurchase={handlePurchase}
            onEquip={handleEquip}
            idx={shipIdx}
            total={SHIPS.length}
            owned={owned}
            equipped={equipped}
            canBuy={canBuy}
            price={ship.price}
            missing={missing}
          />
          </div>
        </div>
      </div>

      {phase === 'loading' && <ShipSelectLoadingScreen progress={loadProgress} />}
      {pendingBuy && (
        <PurchaseModal
          ship={ship}
          grafemas={grafemas}
          onConfirm={confirmPurchase}
          onCancel={cancelPurchase}
        />
      )}
    </>
  );
}
