// Sistema más crítico del motor.
// Gestiona: targeting, estado de palabra activa, WPM, precisión.

import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import {
  WPM_WINDOW_MS,
  WPM_MIN_CHARS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_ERROR_POLICY,
} from '../../shared/constants.js';

export class LexiconSystem {
  constructor() {
    this._targetId   = null;   // id del enemigo activo
    this._targetWord = null;   // palabra a escribir
    this._typed      = '';     // lo que el jugador lleva escrito

    this._keyLog     = [];     // [{ correct: bool, timestamp: ms }]
    this._totalKeys  = 0;
    this._correctKeys = 0;

    this._unsubs     = [];
  }

  init() {
    this._unsubs.push(
      EventBus.on(EventTypes.KEY_TYPED,    (p) => this._onKey(p)),
      EventBus.on(EventTypes.KEY_BACKSPACE, () => this._onBackspace()),
      EventBus.on(EventTypes.TARGET_CHANGED, (p) => this._onTargetChanged(p)),
      EventBus.on(EventTypes.ENEMY_COLLAPSED, (p) => this._onEnemyCollapsed(p)),
    );
  }

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
  }

  // update() llamado cada frame — calcula WPM y publica al Bridge
  update(_delta) {
    const wpm      = this._calcWPM();
    const accuracy = this._calcAccuracy();

    Bridge.setState({ wpm, accuracy });
  }

  // --- Targeting ---

  setTarget(enemyId, word) {
    this._targetId   = enemyId;
    this._targetWord = word.toLowerCase();
    this._typed      = '';

    Bridge.setState({
      targetId:   enemyId,
      activeWord: { word, typed: '' },
    });

    EventBus.emit(EventTypes.TARGET_CHANGED, { enemyId, word });
  }

  clearTarget() {
    this._targetId   = null;
    this._targetWord = null;
    this._typed      = '';
    Bridge.setState({ targetId: null, activeWord: null });
  }

  get currentTargetId() { return this._targetId; }

  _getErrorPolicy() {
    const difficulty = Bridge.getState().difficulty || DIFFICULTY_LEVELS.MEDIUM;
    return DIFFICULTY_ERROR_POLICY[difficulty] || DIFFICULTY_ERROR_POLICY[DIFFICULTY_LEVELS.MEDIUM];
  }

  // --- Input handlers ---

  _onKey({ key, timestamp }) {
    if (!this._targetWord) return;

    const expected = this._targetWord[this._typed.length];
    const correct  = key.toLowerCase() === expected;

    this._totalKeys++;
    this._keyLog.push({ correct, timestamp });

    if (correct) {
      this._correctKeys++;
      this._typed += key;

      const progress = {
        word:    this._targetWord,
        typed:   this._typed,
        correct: true,
      };

      Bridge.setState({ activeWord: { word: this._targetWord, typed: this._typed } });
      EventBus.emit(EventTypes.WORD_PROGRESS, progress);

      if (this._typed.length === this._targetWord.length) {
        this._onWordCompleted();
      }
    } else {
      // Error
      this._keyLog[this._keyLog.length - 1].correct = false;

      EventBus.emit(EventTypes.WORD_PROGRESS, {
        word:    this._targetWord,
        typed:   this._typed,
        correct: false,
        errorAt: this._typed.length,
      });

      const policy = this._getErrorPolicy();

      if (policy === 'reset') {
        this._typed = '';
        Bridge.setState({ activeWord: { word: this._targetWord, typed: '' } });
      }

      if (policy === 'backstep') {
        this._typed = this._typed.slice(0, -1);
        Bridge.setState({ activeWord: { word: this._targetWord, typed: this._typed } });
      }
    }
  }

  _onBackspace() {
    if (!this._targetWord || this._typed.length === 0) return;
    this._typed = this._typed.slice(0, -1);
    Bridge.setState({ activeWord: { word: this._targetWord, typed: this._typed } });
  }

  _onWordCompleted() {
    const wpm      = this._calcWPM();
    const accuracy = this._calcAccuracy();

    EventBus.emit(EventTypes.WORD_COMPLETED, {
      word:     this._targetWord,
      wpm,
      accuracy,
      enemyId:  this._targetId,
    });

    // El EnemySystem / SceneManager decide qué enemigo sigue
    this.clearTarget();
  }

  _onTargetChanged({ enemyId, word }) {
    // Llegó desde el SceneManager (cambio externo de target)
    if (enemyId !== this._targetId) {
      this._targetId   = enemyId;
      this._targetWord = word.toLowerCase();
      this._typed      = '';
      Bridge.setState({ targetId: enemyId, activeWord: { word, typed: '' } });
    }
  }

  _onEnemyCollapsed({ id }) {
    if (id === this._targetId) this.clearTarget();
  }

  // --- Métricas ---

  _calcWPM() {
    const now    = performance.now();
    const cutoff = now - WPM_WINDOW_MS;

    // Filtra eventos dentro de la ventana y solo correctos
    const recent = this._keyLog.filter(e => e.correct && e.timestamp >= cutoff);
    if (recent.length < WPM_MIN_CHARS) return 0;

    // WPM = (chars / 5) / (ventana en minutos)
    const windowMin = WPM_WINDOW_MS / 60000;
    return Math.round((recent.length / 5) / windowMin);
  }

  _calcAccuracy() {
    if (this._totalKeys === 0) return 100;
    return Math.round((this._correctKeys / this._totalKeys) * 100);
  }
}
