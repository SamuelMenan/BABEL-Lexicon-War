// Punto de entrada del motor — inicializa y conecta todos los sistemas

import { Engine } from './core/Engine.js';
import { SceneManager } from './core/SceneManager.js';
import { InputSystem } from './systems/InputSystem.js';
import { LexiconSystem } from './systems/LexiconSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { HUDCanvas } from './rendering/HUDCanvas.js';
import { EventBus } from '../shared/events.js';
import { EventTypes } from '../shared/eventTypes.js';
import { Bridge } from '../shared/bridge.js';

let engine      = null;
let sceneManager = null;

export function initGame(mountEl) {
  engine = new Engine(mountEl);
  engine.init();

  // Sistemas base
  const input   = new InputSystem();
  const lexicon = new LexiconSystem();
  const physics = new PhysicsSystem();

  // Canvas 2D de etiquetas
  const hudCanvas = new HUDCanvas();
  hudCanvas.setCamera(engine.camera);
  hudCanvas.mount();

  input.init();
  lexicon.init();

  engine.addSystem('input',   input);
  engine.addSystem('lexicon', lexicon);
  engine.addSystem('physics', physics);
  engine.addSystem('hudCanvas', hudCanvas);

  // SceneManager necesita la escena lista
  sceneManager = new SceneManager(engine.scene, lexicon, physics, hudCanvas);
  sceneManager.init();

  // El SceneManager actualiza en el loop
  engine.addSystem('scene', {
    update: (delta) => sceneManager.update(delta),
  });

  // Sincronizar lista de enemigos con PhysicsSystem
  EventBus.on(EventTypes.ENEMY_SPAWNED, () => {
    physics.setEnemies(sceneManager.enemies);
  });

  // Pausa / resume
  EventBus.on(EventTypes.GAME_PAUSE, () => {
    engine.loop.stop();
    Bridge.setState({ isRunning: false });
  });

  EventBus.on(EventTypes.GAME_RESUME, () => {
    engine.loop.start();
    Bridge.setState({ isRunning: true });
  });

  EventBus.on(EventTypes.GAME_OVER, (result) => {
    Bridge.setState({ isRunning: false, ...result });
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
