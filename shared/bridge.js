// Puente bidireccional UI ↔ Motor

import { EventBus } from './events.js';
import { EventTypes } from './eventTypes.js';

let _state = {
  // Loading
  isLoading:       true,
  loadingProgress: 0,
  loadingMode:     null,
  loadingMessage:  '',
  wpm:              0,
  accuracy:         100,
  // HULL / SHIELD (hp y energy mantenidos para compatibilidad)
  hp:               100,
  energy:           100,
  maxHp:            100,
  maxShield:        100,
  // LEX-HEAT
  lexHeat:          0,
  lexHeatMax:       100,
  isOverheated:     false,
  overheatTimeLeft: 0,
  activeWord:       null,
  targetId:         null,
  score:            0,
  wave:             0,
  gameMode:         null,
  isRunning:        false,
  isPaused:         false,
  gameOver:         false,
  preCombatActive:  false,
  preCombatStep:    null,
  preCombatValue:   null,
  preCombatMessage: '',
  preCombatLevel:   'yellow',
  // Ship selection
  showShipSelection: false,
  pendingGameMode:   null,
  selectedShip:      null,
  // Economía (mirror de EconomySystem; no mutar desde fuera)
  grafemas:          0,
  ownedShips:        [],
  equippedShip:      null,
  selectedCharacter: 'kael',
  isGuest:           true,
  displayName:       'Invitado',
  // Racing state
  distanceTraveled:       0,
  opponentDistance:       0,
  targetDistance:         500,
  flowMultiplier:         1.0,
  timeRemaining:          90,
  flowStreak:             0,
  raceVictory:            null,
  countdown:              5,
  countdownActive:        false,
  phraseProgress:         0,
  opponentPhraseProgress: 0,
  currentPhrase:          null,
  currentPhraseWordIndex: 0,
  totalPhrases:           0,
  playerPhrasesCompleted: 0,
  wordBuffer:             [],
  globalWordIndex:        0,
  wordsCompleted:         0,
  combatEnemies:    [],
  swarmRemnants:    0,
  flow:             0,
  flowActive:       false,
  flowCooldown:     false,
  warnings: {
    proximityLevel:      'none',
    lowHpLevel:          'none',
    globalLevel:         'none',
    closestEnemyDistance: null,
    lowHp:               false,
  },
  // Tutorial / deployment
  tutorialActive:  null,           // { id, stepIndex } | null
  deploymentPhase: null,           // 'landing' | 'tutorial' | 'countdown' | 'playing' | null
  tutorialsSeen:   {},             // mirror del perfil
};

const stateListeners = new Set();

function notifyStateChange() {
  const snapshot = { ..._state };
  stateListeners.forEach(fn => fn(snapshot));
}

export const Bridge = {
  setState(partial) {
    Object.assign(_state, partial);
    notifyStateChange();
  },

  getState() {
    return { ..._state };
  },

  // Zero-copy read — returns internal reference. Game-loop use only; never store across frames.
  peekState() {
    return _state;
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
    beginLoading(mode) {
      _state = { ..._state, isLoading: true, loadingProgress: 0, loadingMode: mode ?? null, loadingMessage: '' };
      notifyStateChange();
    },
    openShipSelection(mode) {
      _state = { ..._state, showShipSelection: true, pendingGameMode: mode ?? null };
      notifyStateChange();
    },
    confirmShip(shipId) {
      const mode = _state.pendingGameMode;
      Object.assign(_state, { selectedShip: shipId, showShipSelection: false });
      notifyStateChange();
      EventBus.emit(EventTypes.SHIP_CONFIRMED, { shipId });
      EventBus.emit(EventTypes.GAME_START, { mode });
    },
    cancelShipSelection() {
      _state = { ..._state, showShipSelection: false, pendingGameMode: null };
      notifyStateChange();
      EventBus.emit(EventTypes.SHIP_SELECTION_CANCELLED, {});
    },
    startTutorial(id) {
      Object.assign(_state, { tutorialActive: { id, stepIndex: 0 } });
      notifyStateChange();
      EventBus.emit(EventTypes.TUTORIAL_STARTED, { id });
    },
    advanceTutorial() {
      const t = _state.tutorialActive;
      if (!t) return;
      Object.assign(_state, { tutorialActive: { id: t.id, stepIndex: t.stepIndex + 1 } });
      notifyStateChange();
      EventBus.emit(EventTypes.TUTORIAL_STEP_CHANGED, { id: t.id, step: t.stepIndex + 1 });
    },
    backTutorial() {
      const t = _state.tutorialActive;
      if (!t || t.stepIndex <= 0) return;
      Object.assign(_state, { tutorialActive: { id: t.id, stepIndex: t.stepIndex - 1 } });
      notifyStateChange();
      EventBus.emit(EventTypes.TUTORIAL_STEP_CHANGED, { id: t.id, step: t.stepIndex - 1 });
    },
    skipTutorial() {
      const t = _state.tutorialActive;
      if (!t) return;
      const atStep = t.stepIndex;
      Object.assign(_state, { tutorialActive: null });
      notifyStateChange();
      EventBus.emit(EventTypes.TUTORIAL_SKIPPED, { id: t.id, atStep });
    },
    completeTutorial() {
      const t = _state.tutorialActive;
      if (!t) return;
      Object.assign(_state, { tutorialActive: null });
      notifyStateChange();
      EventBus.emit(EventTypes.TUTORIAL_COMPLETED, { id: t.id });
    },
    resetTutorials() {
      Object.assign(_state, { tutorialsSeen: {}, tutorialActive: null, deploymentPhase: null });
      notifyStateChange();
    },
    // Salir desde pause sin reload — preserva flags de epilepsia/presentación.
    exitToMenu() {
      EventBus.emit(EventTypes.EXIT_TO_MENU);
    },
    exitToHangar() {
      const mode = _state.gameMode;
      EventBus.emit(EventTypes.EXIT_TO_HANGAR, { mode });
    },
  },
};
