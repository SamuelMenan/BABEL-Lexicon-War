import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { ShipSelectionScene } from '../../../game/scenes/ShipSelectionScene.js';
import { Bridge } from '../../../shared/bridge.js';
import { EventTypes } from '../../../shared/eventTypes.js';
import { KeybindService } from '../../../shared/keybindService.js';
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
import CharacterSelectModal from './CharacterSelectModal.jsx';
import GuestPromptModal from '../auth/GuestPromptModal.jsx';
import { getCharacter } from '../../../shared/characterData.js';

const MIN_LOADING_MS = 1800;
const PROGRESS_TICK  = 80;
const PROGRESS_STEP  = 3.5;

export default function HangarScreen() {
  const mountRef   = useRef(null);
  const sceneRef   = useRef(null);
  const shipIdxRef = useRef(0);

  const [shipIdx,       setShipIdx]      = useState(0);
  const [, forceUpdate]                   = useReducer(x => x + 1, 0);
  const [pendingBuy,    setPendingBuy]   = useState(false);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [canvasAlpha,  setCanvasAlpha]  = useState(1);
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

    // PRELOAD COMBAT + RACING ASSETS WHILE IN HANGAR. Both manifests include
    // cb1 — preloading here means hangar's own `getGLTF` cache hit on next
    // ship-switch instead of re-downloading 34MB.
    import('../../../game/core/AssetLoader.js').then(({ AssetLoader }) => {
      AssetLoader.preload('combat').catch(err => console.error('Preload combat error:', err));
      AssetLoader.preload('racing').catch(err => console.error('Preload racing error:', err));
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

  // Acciones de hangar registradas en KeybindService (scope 'hangar').
  useEffect(() => {
    const offs = [
      KeybindService.register('hangar', 'NAV_PREV', () => navigateTo(shipIdxRef.current - 1)),
      KeybindService.register('hangar', 'NAV_NEXT', () => navigateTo(shipIdxRef.current + 1)),
      KeybindService.register('hangar', 'HANGAR_CAM_RESET', () => sceneRef.current?.resetOrbit()),
      KeybindService.register('hangar', 'HANGAR_CAM_CYCLE', () => sceneRef.current?.cycleCameraView()),
      KeybindService.register('hangar', 'CONFIRM', () => {
        const sid = SHIPS[shipIdxRef.current].id;
        if (!EconomySystem.ownsShip(sid)) {
          if (EconomySystem.canAfford(sid)) handlePurchase();
        } else if (EconomySystem.getEquippedShip() !== sid) {
          handleEquip();
        } else {
          handleConfirm();
        }
      }),
      KeybindService.register('hangar', 'CANCEL', () => handleCancel()),
    ];
    return () => offs.forEach(fn => fn());
  }, [navigateTo]);

  // WASD hold para mover camara orbital. Listener separado del service
  // porque son teclas continuas (hold), no acciones discretas.
  useEffect(() => {
    const HOLD_KEYS = new Set(['a','A','w','W','s','S','d','D']);
    function onKeyDown(e) {
      if (HOLD_KEYS.has(e.key)) sceneRef.current?.addKey(e.key);
    }
    function onKeyUp(e) {
      if (HOLD_KEYS.has(e.key)) sceneRef.current?.removeKey(e.key);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

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
    if (!EconomySystem.ownsShip(shipId)) return; // bloqueo: no poseida
    if (EconomySystem.getEquippedShip() !== shipId) EconomySystem.equipShip(shipId);
    deployingRef.current = true;
    const scene = sceneRef.current;
    Bridge.setState({ deploymentPhase: 'landing' });
    if (scene) {
      await scene.triggerDeployment();
    }
    // No emitir DEPLOYMENT_ANIMATION_COMPLETE aqui — lo hace game/main.js
    // tras mount de combat/racing scene para evitar tutorial sobre fondo vacio.
    Bridge.commands.confirmShip(shipId);
  }
  function handleCancel()  { Bridge.commands.cancelShipSelection(); }

  function handlePurchase() {
    if (EconomySystem.isGuest()) { setShowGuestPrompt(true); return; }
    const shipId = SHIPS[shipIdxRef.current].id;
    if (!EconomySystem.canAfford(shipId)) return;
    setPendingBuy(true);
  }
  function confirmPurchase() {
    const shipId = SHIPS[shipIdxRef.current].id;
    const res = EconomySystem.purchaseShip(shipId);
    if (res.ok) forceUpdate();
    setPendingBuy(false);
  }
  function cancelPurchase() { setPendingBuy(false); }
  function openCharSelect()   { setShowCharSelect(true); }
  function cancelCharSelect() { setShowCharSelect(false); }
  function confirmCharSelect(characterId) {
    EconomySystem.setSelectedCharacter(characterId);
    setShowCharSelect(false);
    forceUpdate();
  }
  function handleEquip() {
    const shipId = SHIPS[shipIdxRef.current].id;
    const res = EconomySystem.equipShip(shipId);
    if (res.ok) forceUpdate();
  }

  useEffect(() => {
    return Bridge.onStateChange(() => forceUpdate());
  }, []);

  const ship     = SHIPS[shipIdx];
  const shipData = getShipData(ship.id);
  const owned    = EconomySystem.ownsShip(ship.id);
  const equipped = EconomySystem.getEquippedShip() === ship.id;
  const canBuy   = !owned && EconomySystem.canAfford(ship.id);
  const grafemas = EconomySystem.getGrafemas();
  const missing  = !owned ? Math.max(0, (ship.price ?? 0) - grafemas) : 0;

  return (
    <>
      <div style={{ visibility: phase === 'loading' ? 'hidden' : 'visible', position: 'absolute', inset: 0 }}>
        <div className="hangar">
          <div ref={mountRef} className="hangar__canvas" style={{ opacity: canvasAlpha }} />

          <HangarFrame />

          <div className="hud-safe-zone">
          <HangarHeader ship={ship} character={getCharacter(EconomySystem.getSelectedCharacter())} />

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
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onPurchase={handlePurchase}
            onEquip={handleEquip}
            onOpenCharSelect={openCharSelect}
            character={getCharacter(EconomySystem.getSelectedCharacter())}
            idx={shipIdx}
            total={SHIPS.length}
            owned={owned}
            equipped={equipped}
            canBuy={canBuy}
            price={ship.price}
            missing={missing}
            isGuest={EconomySystem.isGuest()}
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
      {showCharSelect && (
        <CharacterSelectModal
          currentId={EconomySystem.getSelectedCharacter()}
          onConfirm={confirmCharSelect}
          onCancel={cancelCharSelect}
        />
      )}
      {showGuestPrompt && (
        <GuestPromptModal
          feature="purchase"
          onClose={() => setShowGuestPrompt(false)}
          onAuthSuccess={() => { setShowGuestPrompt(false); forceUpdate(); }}
        />
      )}
    </>
  );
}
