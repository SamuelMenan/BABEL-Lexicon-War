import { Engine } from './core/Engine.js';
import { AssetLoader } from './core/AssetLoader.js';
import { CombatSceneManager } from './core/CombatSceneManager.js';
import { RacingSceneManager } from './core/RacingSceneManager.js';
import { InputSystem } from './domains/input/InputSystem.js';
import { LexiconSystem } from './domains/lexicon/LexiconSystem.js';
import { PhysicsSystem } from './domains/physics/PhysicsSystem.js';
import { RacingSystem } from './domains/racing/systems/RacingSystem.js';
import { HUDCanvas } from './rendering/hud-canvas/HUDCanvas.js';
import { TelemetrySystem } from './domains/telemetry/TelemetrySystem.js';
import { EventBus } from '@shared/state/events.js';
import { EventTypes } from '@shared/state/eventTypes.js';
import { Bridge } from '@shared/state/bridge.js';
import { GAME_MODES } from '@shared/config/constants.js';
import { initAutoTyper, destroyAutoTyper } from './domains/lexicon/AutoTyper.js';
import { playSfx } from '@shared/services/audioManager.js';

let engine       = null;
let _lexicon     = null;
let _physics     = null;
let _activeScene = null;
let _performanceModeEnabled = true;
let _pauseSnapshot = null;
let _pendingCountdownStart = null;

export async function initGame(mountEl) {
  engine = new Engine(mountEl);
  engine.init();

  const input     = new InputSystem();
  _lexicon        = new LexiconSystem();
  _physics        = new PhysicsSystem();
  const hudCanvas = new HUDCanvas();

  hudCanvas.setCamera(engine.camera);
  hudCanvas.mount();

  input.init();
  _lexicon.init();

  engine.addSystem('input',     input);
  engine.addSystem('lexicon',   _lexicon);
  engine.addSystem('physics',   _physics);
  engine.addSystem('hudCanvas', hudCanvas);
  engine.addSystem('telemetry', TelemetrySystem);

  // Single proxy slot — swapped out per mode without accumulating loop entries.
  // Skip scene update while tutorial modal is open (no enemy spawn, no damage, no countdown tick).
  engine.addSystem('scene', { update: (d) => {
    if (Bridge.peekState().tutorialActive) return; // pausa total durante tutorial
    _activeScene?.update(d);
  }});

  EventBus.on(EventTypes.GAME_START, async ({ mode }) => {
    _activeScene?.destroy();
    _activeScene = null;
    _pendingCountdownStart = null;

    // Show loading for this mode (cache makes re-entry fast)
    await AssetLoader.preload(mode, engine.renderer);

    // Reset per-match stat fields to avoid cross-match contamination (B1).
    // Without this, e.g. peakWPM from previous race carries into a combat row.
    _lexicon.resetMatchStats?.();
    Bridge.setState({
      isRunning: true, isPaused: false, gameMode: mode, gameOver: false,
      score: null, wpm: null, accuracy: null, wave: null,
      peakWPM: null, timeElapsed: null, grafemasReward: null,
      raceVictory: null,
      wordsDestroyed: null, bestCombo: null,
      // Combat-only warning state. Without reset it bleeds into race HUD
      // (red LowHpFrame / proximity edges showing during a clean race).
      lowHpLevel: 'none', proximityLevel: 'none',
      warnings: { proximityLevel: 'none', lowHpLevel: 'none', lowHp: false, globalLevel: 'none' },
    });

    if (mode === GAME_MODES.RACING) {
      engine.camController.setRacingMode(true);
      engine.suppressGlobalLights();
      hudCanvas.setTokens([]);
      _physics.setEnemies([]);

      const rsm = new RacingSceneManager(engine.scene, hudCanvas, engine.camController);
      rsm.init();
      engine.invalidateBloomCache();

      const rs = new RacingSystem(_lexicon);
      rs.init({ deferStart: true });

      _activeScene = {
        update:  (d) => { rsm.update(d); rs.update(d); },
        destroy: ()  => { rsm.destroy(); rs.destroy(); engine.camController.setRacingMode(false); engine.restoreGlobalLights(); },
      };

      _pendingCountdownStart = () => rs.armCountdown();
    } else {
      engine.camController.setRacingMode(false);

      const sm = new CombatSceneManager(engine.scene, _lexicon, _physics, hudCanvas, engine.camController);
      sm.init();
      sm.warmShaders(engine.renderer, engine.camera);
      engine.invalidateBloomCache();

      _physics.setEnemies(sm.enemies);
      _activeScene = sm;
      _pendingCountdownStart = () => sm.startCombatWithCountdown();
    }

    // Animacion de entrada por modo: combat ship _entryDuration=3.5s, racing player=5.0s.
    // Esperar a que la nave aterrice antes de mostrar tutorial.
    Bridge.setState({ deploymentPhase: 'landing' });
    playSfx('shiparrival.land');
    const landingMs = mode === 'racing' ? 5200 : 3800;
    await new Promise(r => setTimeout(r, landingMs));

    // Tras entrada visible, dispara tutorial (si first-time) o START_COUNTDOWN inmediato.
    EventBus.emit(EventTypes.DEPLOYMENT_ANIMATION_COMPLETE, { mode });
  });

  EventBus.on(EventTypes.START_COUNTDOWN, () => {
    Bridge.setState({ deploymentPhase: 'countdown' });
    const fn = _pendingCountdownStart;
    _pendingCountdownStart = null;
    fn?.();
  });

  EventBus.on(EventTypes.GAME_PAUSE, () => {
    _pauseSnapshot = {
      isRunning: Bridge.peekState().isRunning,
      showShipSelection: Bridge.peekState().showShipSelection,
      pendingGameMode: Bridge.peekState().pendingGameMode,
      gameMode: Bridge.peekState().gameMode,
    };
    engine.loop.stop();
    Bridge.setState({ isRunning: false, isPaused: true });
  });

  EventBus.on(EventTypes.GAME_RESUME, () => {
    const pauseSnapshot = _pauseSnapshot;
    _pauseSnapshot = null;

    if (pauseSnapshot?.showShipSelection) {
      Bridge.setState({
        isRunning: false,
        isPaused: false,
        showShipSelection: true,
        pendingGameMode: pauseSnapshot.pendingGameMode ?? Bridge.peekState().pendingGameMode,
      });
      return;
    }

    engine.loop.start();
    Bridge.setState({ isRunning: true, isPaused: false, showShipSelection: false });
  });

  EventBus.on(EventTypes.GAME_OVER, (result) => {
    Bridge.setState({ isRunning: false, isPaused: false, gameOver: true, ...result });
  });

  // Salir desde pause al menu principal — destruye escena, limpia estado de juego.
  EventBus.on(EventTypes.EXIT_TO_MENU, () => {
    _activeScene?.destroy();
    _activeScene = null;
    _pendingCountdownStart = null;
    _pauseSnapshot = null;
    engine.loop.start();   // re-iniciar loop (estaba detenido por GAME_PAUSE)
    Bridge.setState({
      isRunning: false, isPaused: false, gameOver: false,
      showShipSelection: false, pendingGameMode: null, gameMode: null,
      tutorialActive: null, deploymentPhase: null,
      onlineEnabled: false, onlineRoom: null, onlineRole: null,
      onlinePilot: null, onlineOpponentShip: null, onlineOpponentPilot: null,
      onlineOpponentStats: null, onlineOpponentReady: false, onlineConnection: 'idle',
    });
  });

  // Salir desde pause al hangar — destruye escena, abre ship selection con mode previo.
  EventBus.on(EventTypes.EXIT_TO_HANGAR, ({ mode } = {}) => {
    _activeScene?.destroy();
    _activeScene = null;
    _pendingCountdownStart = null;
    _pauseSnapshot = null;
    engine.loop.start();   // re-iniciar loop (estaba detenido por GAME_PAUSE)
    Bridge.setState({
      isRunning: false, isPaused: false, gameOver: false,
      showShipSelection: true, pendingGameMode: mode ?? null, gameMode: null,
      tutorialActive: null, deploymentPhase: null,
      // Limpiar estado online — sesion termino, no debe persistir a hangar.
      onlineEnabled: false, onlineRoom: null, onlineRole: null,
      onlinePilot: null, onlineOpponentShip: null, onlineOpponentPilot: null,
      onlineOpponentStats: null, onlineOpponentReady: false, onlineConnection: 'idle',
    });
  });

  EventBus.on(EventTypes.PLAYER_HIT, ({ damage }) => {
    engine?.onPlayerDamage?.(damage ?? 0);
  });

  EventBus.on(EventTypes.PERFORMANCE_TOGGLE, () => {
    _performanceModeEnabled = !_performanceModeEnabled;
    engine?.setBloomEnabled?.(_performanceModeEnabled);
    console.log(`[BABEL] Performance mode ${_performanceModeEnabled ? 'ON' : 'OFF'} (F9)`);
  });

  engine.start();
  initAutoTyper();

  // Initial shared preload — shows LoadingScreen until done, then MainMenu appears
  await AssetLoader.preload(null, engine.renderer);
}

export function destroyGame() {
  destroyAutoTyper();
  _activeScene?.destroy();
  engine?.destroy();
  EventBus.off();
  engine       = null;
  _activeScene = null;
  _lexicon     = null;
  _physics     = null;
}
