import React, { useEffect, useRef, useState } from 'react';
import { Bridge } from '@shared/state/bridge.js';
import { EventBus } from '@shared/state/events.js';
import { EventTypes } from '@shared/state/eventTypes.js';
import { KeybindService } from '@shared/services/keybindService.js';
import { getShipsForHangar } from '@shared/data/shopCatalog.js';
import { EconomySystem } from '@game/domains/economy/EconomySystem.js';
import { playSfx } from '@shared/services/audioManager.js';
import { getShipData } from '@game/data/shipData.js';
import { getCharacter } from '@shared/data/characterData.js';
import { useHangarScene } from './useHangarScene.js';
import HangarShell from './HangarShell.jsx';
import HangarHeader from './HangarHeader.jsx';
import ShipInfo from './ShipInfo.jsx';
import ShipStats from './ShipStats.jsx';
import ShipArsenal from './ShipArsenal.jsx';
import ShipNav from './ShipNav.jsx';
import HangarControls from './HangarControls.jsx';
import PurchaseModal from './PurchaseModal.jsx';
import CharacterSelectModal from './CharacterSelectModal.jsx';
import GuestPromptModal from '../auth/GuestPromptModal.jsx';

const SHIPS = getShipsForHangar();

export default function HangarScreen() {
  const [pendingBuy,      setPendingBuy]      = useState(false);
  const [showCharSelect,  setShowCharSelect]  = useState(false);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  const deployingRef = useRef(false);

  const {
    mountRef, sceneRef, shipIdx, shipIdxRef, canvasAlpha, phase, loadProgress,
    navigateTo, forceUpdate,
  } = useHangarScene({
    bgm: 'bgm.hangar',
    minLoadingMs: 1800,
    // Al cerrar el tutorial de hangar (primera entrada), abrir seleccion de
    // piloto automaticamente. tutorialController emite TUTORIAL_COMPLETED tras
    // SHIP_SELECTION_OPENED si no fue visto antes. Ademas precargar assets de
    // combat + racing mientras el jugador esta en hangar (cache hit luego).
    onSceneMount: () => {
      const offTutorial = EventBus.on(EventTypes.TUTORIAL_COMPLETED, (p) => {
        if (p?.id === 'hangar') setShowCharSelect(true);
      });
      const offTutorialSkip = EventBus.on(EventTypes.TUTORIAL_SKIPPED, (p) => {
        if (p?.id === 'hangar') setShowCharSelect(true);
      });
      import('@game/core/AssetLoader.js').then(({ AssetLoader }) => {
        AssetLoader.preload('combat').catch(err => console.error('Preload combat error:', err));
        AssetLoader.preload('racing').catch(err => console.error('Preload racing error:', err));
      });
      return () => { offTutorial(); offTutorialSkip(); };
    },
  });

  // Acciones de hangar registradas en KeybindService (scope 'hangar').
  useEffect(() => {
    const offs = [
      KeybindService.register('hangar', 'NAV_PREV', () => navigateTo(shipIdxRef.current - 1)),
      KeybindService.register('hangar', 'NAV_NEXT', () => navigateTo(shipIdxRef.current + 1)),
      KeybindService.register('hangar', 'HANGAR_CAM_RESET', () => sceneRef.current?.resetOrbit()),
      KeybindService.register('hangar', 'HANGAR_CAM_CYCLE', () => sceneRef.current?.cycleCameraView()),
      KeybindService.register('hangar', 'HANGAR_LASER',     () => sceneRef.current?.toggleLaser?.()),
      KeybindService.register('hangar', 'HANGAR_BOOSTERS',  () => sceneRef.current?.toggleFlowSim?.()),
      KeybindService.register('hangar', 'HANGAR_DETONATE',  () => sceneRef.current?.detonateCurrentShip?.()),
      KeybindService.register('hangar', 'SELECT_PILOT',     () => openCharSelect()),
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
    if (res.ok) { playSfx('purchase.success'); forceUpdate(); }
    else playSfx('purchase.fail');
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

  const ship     = SHIPS[shipIdx];
  const shipData = getShipData(ship.id);
  const owned    = EconomySystem.ownsShip(ship.id);
  const equipped = EconomySystem.getEquippedShip() === ship.id;
  const canBuy   = !owned && EconomySystem.canAfford(ship.id);
  const grafemas = EconomySystem.getGrafemas();
  const missing  = !owned ? Math.max(0, (ship.price ?? 0) - grafemas) : 0;

  return (
    <>
      <HangarShell phase={phase} loadProgress={loadProgress} canvasAlpha={canvasAlpha} mountRef={mountRef}>
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
      </HangarShell>

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
