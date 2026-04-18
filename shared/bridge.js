// Puente bidireccional UI ↔ Motor
// app/ usa Bridge para leer estado del motor.
// game/ usa Bridge para publicar estado hacia la UI.
// Ninguno importa al otro directamente.

import { EventBus } from './events.js';
import { EventTypes } from './eventTypes.js';

// Estado reactivo del juego — la UI lee esto vía suscripción
let _state = {
  wpm:         0,
  accuracy:    100,
  hp:          100,
  energy:      100,
  activeWord:  null,     // { word: string, typed: string }
  targetId:    null,
  score:       0,
  wave:        0,
  gameMode:    null,
  isRunning:   false,
};

const stateListeners = new Set();

function notifyStateChange() {
  const snapshot = { ..._state };
  stateListeners.forEach(fn => fn(snapshot));
}

export const Bridge = {
  // --- Motor → UI: publicar estado ---

  setState(partial) {
    _state = { ..._state, ...partial };
    notifyStateChange();
  },

  getState() {
    return { ..._state };
  },

  // --- UI: suscribirse a cambios de estado ---
  onStateChange(fn) {
    stateListeners.add(fn);
    fn({ ..._state }); // emite estado actual inmediatamente
    return () => stateListeners.delete(fn);
  },

  // --- Motor → UI: eventos puntuales (no estado continuo) ---
  emit(type, payload) {
    EventBus.emit(type, payload);
  },

  // --- UI → Motor: comandos ---
  on(type, handler) {
    return EventBus.on(type, handler);
  },

  // --- Comandos que la UI puede enviar al motor ---
  commands: {
    startGame(mode) {
      EventBus.emit(EventTypes.GAME_START, { mode });
    },
    pauseGame() {
      EventBus.emit(EventTypes.GAME_PAUSE);
    },
    resumeGame() {
      EventBus.emit(EventTypes.GAME_RESUME);
    },
  },
};
