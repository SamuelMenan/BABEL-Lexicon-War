import { Engine } from './core/Engine.js';
import { AssetLoader } from './core/AssetLoader.js';
import { CombatSceneManager } from './core/CombatSceneManager.js';
import { RacingSceneManager } from './core/RacingSceneManager.js';
import { InputSystem } from './systems/InputSystem.js';
import { LexiconSystem } from './systems/LexiconSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { RacingSystem } from './systems/RacingSystem.js';
import { HUDCanvas } from './rendering/HUDCanvas.js';
import { EventBus } from '../shared/events.js';
import { EventTypes } from '../shared/eventTypes.js';
import { Bridge } from '../shared/bridge.js';
import { GAME_MODES } from '../shared/constants.js';

let engine       = null;
let _lexicon     = null;
let _physics     = null;
let _activeScene = null;

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

  // Single proxy slot — swapped out per mode without accumulating loop entries
  engine.addSystem('scene', { update: (d) => _activeScene?.update(d) });

  EventBus.on(EventTypes.GAME_START, async ({ mode }) => {
    _activeScene?.destroy();
    _activeScene = null;

    // Show loading for this mode (cache makes re-entry fast)
    await AssetLoader.preload(mode, engine.renderer);

    Bridge.setState({ isRunning: true, gameMode: mode });

    if (mode === GAME_MODES.RACING) {
      engine.camController.setRacingMode(true);
      hudCanvas.setTokens([]);
      _physics.setEnemies([]);

      const rsm = new RacingSceneManager(engine.scene, hudCanvas, engine.camController);
      rsm.init();

      const rs = new RacingSystem(_lexicon);
      rs.init();

      _activeScene = {
        update:  (d) => { rsm.update(d); rs.update(d); },
        destroy: ()  => { rsm.destroy(); rs.destroy(); engine.camController.setRacingMode(false); },
      };

    } else {
      engine.camController.setRacingMode(false);

      const sm = new CombatSceneManager(engine.scene, _lexicon, _physics, hudCanvas, engine.camController);
      sm.init();

      _physics.setEnemies(sm.enemies);
      sm._startWave();

      _activeScene = sm;
    }
  });

  EventBus.on(EventTypes.GAME_PAUSE, () => {
    engine.loop.stop();
    Bridge.setState({ isRunning: false });
  });

  EventBus.on(EventTypes.GAME_RESUME, () => {
    engine.loop.start();
    Bridge.setState({ isRunning: true });
  });

  EventBus.on(EventTypes.GAME_OVER, (result) => {
    Bridge.setState({ isRunning: false, gameOver: true, ...result });
  });

  EventBus.on(EventTypes.PLAYER_HIT, ({ damage }) => {
    engine?.onPlayerDamage?.(damage ?? 0);
  });

  engine.start();

  // Initial shared preload — shows LoadingScreen until done, then MainMenu appears
  await AssetLoader.preload(null, engine.renderer);
}

export function destroyGame() {
  _activeScene?.destroy();
  engine?.destroy();
  EventBus.off();
  engine       = null;
  _activeScene = null;
  _lexicon     = null;
  _physics     = null;
}
