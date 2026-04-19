// Puente bidireccional UI ↔ Motor

import { EventBus } from './events.js';
import { EventTypes } from './eventTypes.js';

let _state = {
  wpm:              0,
  accuracy:         100,
  hp:               100,
  energy:           100,
  activeWord:       null,
  targetId:         null,
  score:            0,
  wave:             0,
  gameMode:         null,
  isRunning:        false,
  // Racing state
  distanceTraveled: 0,
  targetDistance:   500,
  flowMultiplier:   1.0,
  timeRemaining:    90,
  flowStreak:       0,
  raceVictory:      null,
};

const stateListeners = new Set();

function notifyStateChange() {
  const snapshot = { ..._state };
  stateListeners.forEach(fn => fn(snapshot));
}

export const Bridge = {
  setState(partial) {
    _state = { ..._state, ...partial };
    notifyStateChange();
  },

  getState() {
    return { ..._state };
  },

  onStateChange(fn) {
    stateListeners.add(fn);
    fn({ ..._state });
    return () => stateListeners.delete(fn);
  },

  emit(type, payload) {
    EventBus.emit(type, payload);
  },

  on(type, handler) {
    return EventBus.on(type, handler);
  },

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
