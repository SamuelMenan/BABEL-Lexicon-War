import { Engine } from './core/Engine.js';
import { SceneManager } from './core/SceneManager.js';
import { InputSystem } from './systems/InputSystem.js';
import { LexiconSystem } from './systems/LexiconSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { HUDCanvas } from './rendering/HUDCanvas.js';
import { EventBus } from '../shared/events.js';
import { EventTypes } from '../shared/eventTypes.js';
import { Bridge } from '../shared/bridge.js';

let engine       = null;
let sceneManager = null;

export function initGame(mountEl) {
  engine = new Engine(mountEl);
  engine.init();

  const input     = new InputSystem();
  const lexicon   = new LexiconSystem();
  const physics   = new PhysicsSystem();
  const hudCanvas = new HUDCanvas();

  hudCanvas.setCamera(engine.camera);
  hudCanvas.mount();

  input.init();
  lexicon.init();

  engine.addSystem('input',     input);
  engine.addSystem('lexicon',   lexicon);
  engine.addSystem('physics',   physics);
  engine.addSystem('hudCanvas', hudCanvas);

  sceneManager = new SceneManager(engine.scene, lexicon, physics, hudCanvas);
  sceneManager.init();

  engine.addSystem('scene', {
    update: (delta) => sceneManager.update(delta),
  });

  EventBus.on(EventTypes.ENEMY_SPAWNED, () => {
    physics.setEnemies(sceneManager.enemies);
  });

  // FIX: marcar juego como activo al recibir GAME_START
  EventBus.on(EventTypes.GAME_START, ({ mode }) => {
    Bridge.setState({ isRunning: true, gameMode: mode });
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

  engine.start();
  return engine;
}

export function destroyGame() {
  sceneManager?.destroy();
  engine?.destroy();
  EventBus.off();
  engine       = null;
  sceneManager = null;
}
