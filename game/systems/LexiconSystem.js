import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import {
  WPM_WINDOW_MS, WPM_MIN_CHARS, WORD_ERROR_PENALTY, PLAYER_MAX_HP,
  FLOW_MAX, FLOW_GAIN_PER_LETTER, FLOW_DECAY_IDLE, FLOW_DECAY_ACTIVE,
  FLOW_PENALTY_HIT, FLOW_PENALTY_MISS, FLOW_HEAL_RATE, FLOW_COOLDOWN_MS,
  DEFAULT_EXECUTION_MODE,
} from '../../shared/constants.js';
import { workerBridge } from '../workers/workerBridge.js';
import { playSfx } from '../../shared/audioManager.js';

const FLOW_IDLE_THRESHOLD_MS = 1500;
const FLOW_PUBLISH_HZ        = 10;
const STATS_PUBLISH_HZ       = 10; // wpm/accuracy: 10Hz, no 60Hz

export class LexiconSystem {
  constructor() {
    this._targetId   = null; this._targetWord = null; this._typed = '';
    this._keyLog = []; this._totalKeys = 0; this._correctKeys = 0;
    this._flow = 0; this._flowActive = false; this._flowCooldown = false;
    this._flowCooldownTimer = null; this._lastKeyTime = performance.now();
    this._combo = 0; this._bestCombo = 0; this._wordsCompleted = 0;
    this._peakWPM = 0;
    this._wordHadError = false; this._flowProgressAcc = 0;
    this._flowEnterTime = 0; this._flowWordsTyped = 0;
    this._unsubs = [];
    this._matchInflight = false;
    this._statsAcc = 0;
    this._lastWpm = -1; this._lastAcc = -1;
    workerBridge.setMode(DEFAULT_EXECUTION_MODE);
  }
  // Delegate fuzzy/multi-word matching to workerBridge (NORMAL or PARALLEL).
  // typedText: string, activeWords: [{id,word}] -> Promise<{matches, collapsed}>
  async matchInput(typedText, activeWords) {
    if (this._matchInflight) return null;
    this._matchInflight = true;
    try { return await workerBridge.processInput(typedText, activeWords); }
    finally { this._matchInflight = false; }
  }
  setExecutionMode(mode) { workerBridge.setMode(mode); }
  // Total correct keystrokes since last resetMatchStats(). Used by Racing/Combat
  // systems to compute average WPM per match (avg = (correctKeys/5)/minutes),
  // estandar de mecanografia competitiva. Mas fiable que la ventana rolling de
  // 5s usada para WPM en vivo, especialmente para definir ganadores online.
  getCorrectKeys() { return this._correctKeys; }
  getTotalKeys()   { return this._totalKeys; }
  // Per-match counters reset. Called from game/main.js on GAME_START to avoid
  // bleed of combo/words/keystrokes from previous match into the new row.
  resetMatchStats() {
    this._combo = 0; this._bestCombo = 0; this._wordsCompleted = 0;
    this._peakWPM = 0;
    this._totalKeys = 0; this._correctKeys = 0; this._keyLog = [];
    this._wordHadError = false; this._lastWpm = -1; this._lastAcc = -1;
  }
  init() {
    this._unsubs.push(
      EventBus.on(EventTypes.KEY_TYPED,       (p) => this._onKey(p)),
      EventBus.on(EventTypes.KEY_BACKSPACE,   () => this._onBackspace()),
      EventBus.on(EventTypes.TARGET_CHANGED,  (p) => this._onTargetChanged(p)),
      EventBus.on(EventTypes.ENEMY_COLLAPSED, (p) => this._onEnemyCollapsed(p)),
      EventBus.on(EventTypes.PLAYER_HIT,      () => this._addFlow(-FLOW_PENALTY_HIT)),
    );
  }
  destroy() {
    this._unsubs.forEach(fn => fn()); this._unsubs = [];
    if (this._flowCooldownTimer) { clearTimeout(this._flowCooldownTimer); this._flowCooldownTimer = null; }
  }
  update(delta) {
    this._statsAcc += delta;
    if (this._statsAcc >= 1 / STATS_PUBLISH_HZ) {
      this._statsAcc = 0;
      const wpm = this._calcWPM(); const accuracy = this._calcAccuracy();
      if (wpm > this._peakWPM) this._peakWPM = wpm;
      // No publicar mientras gameOver — el payload final del match (avgWPM, etc.)
      // sobrescribiria con la ventana rolling de 5s que decae a 0 segundos despues.
      if (Bridge.peekState().gameOver) return;
      if (wpm !== this._lastWpm || accuracy !== this._lastAcc) {
        this._lastWpm = wpm; this._lastAcc = accuracy;
        Bridge.setState({ wpm, accuracy, peakWPM: this._peakWPM });
      }
    }
    this._updateFlow(delta);
  }
  setTarget(enemyId, word) {
    if (!word || typeof word !== 'string') { console.warn('[LexiconSystem] invalid word', word); return; }
    this._targetId = enemyId; this._targetWord = word.toLowerCase(); this._typed = ''; this._wordHadError = false;
    Bridge.setState({ targetId: enemyId, activeWord: { word, typed: '' } });
    EventBus.emit(EventTypes.TARGET_CHANGED, { enemyId, word });
  }
  clearTarget() {
    this._targetId = null; this._targetWord = null; this._typed = ''; this._wordHadError = false;
    Bridge.setState({ targetId: null, activeWord: null });
  }
  get currentTargetId() { return this._targetId; }
  _onKey({ key, timestamp }) {
    this._lastKeyTime = (timestamp != null) ? timestamp : performance.now();
    if (!this._targetWord) return;
    if (key === ' ') { if (this._targetWord && this._typed.length === this._targetWord.length) this._onWordCompleted(); return; }
    const expected = this._targetWord[this._typed.length];
    const correct  = key.toLowerCase() === expected;
    this._totalKeys++;
    this._keyLog.push({ correct, timestamp: this._lastKeyTime });
    if (correct) {
      this._correctKeys++; this._typed += key;
      const wpmMod = this._wpmModifier(); const comboMod = 1 + Math.min(this._combo * 0.05, 0.5);
      this._addFlow(FLOW_GAIN_PER_LETTER * wpmMod * comboMod);
      Bridge.setState({ activeWord: { word: this._targetWord, typed: this._typed } });
      EventBus.emit(EventTypes.WORD_PROGRESS, { word: this._targetWord, typed: this._typed, correct: true });
      if (this._typed.length === this._targetWord.length) this._onWordCompleted();
    } else {
      this._keyLog[this._keyLog.length - 1].correct = false;
      this._wordHadError = true; this._addFlow(-FLOW_PENALTY_MISS);
      EventBus.emit(EventTypes.WORD_PROGRESS, { word: this._targetWord, typed: this._typed, correct: false, errorAt: this._typed.length });
      if (WORD_ERROR_PENALTY === 'reset') { this._typed = ''; Bridge.setState({ activeWord: { word: this._targetWord, typed: '' } }); }
    }
  }
  _onBackspace() {
    if (!this._targetWord || this._typed.length === 0) return;
    this._typed = this._typed.slice(0, -1);
    Bridge.setState({ activeWord: { word: this._targetWord, typed: this._typed } });
  }
  _onWordCompleted() {
    if (!this._wordHadError) {
      const wordLen = this._targetWord ? this._targetWord.length : 0;
      const wpmMod = this._wpmModifier(); const comboMod = 1 + Math.min(this._combo * 0.05, 0.5);
      this._addFlow(wordLen * 0.8 * wpmMod * comboMod); this._combo++;
      if (this._combo > this._bestCombo) this._bestCombo = this._combo;
    } else { this._combo = 0; }
    this._wordsCompleted++;
    Bridge.setState({ wordsDestroyed: this._wordsCompleted, bestCombo: this._bestCombo });
    this._flowWordsTyped++; this._wordHadError = false;
    const wpm = this._calcWPM(); const accuracy = this._calcAccuracy();
    const completedId = this._targetId; const completedWord = this._targetWord;
    EventBus.emit(EventTypes.WORD_COMPLETED, { word: completedWord, wpm, accuracy, enemyId: completedId });
    if (this._targetId === completedId) this.clearTarget();
  }
  _onTargetChanged({ enemyId, word }) {
    if (enemyId !== this._targetId) {
      this._targetId = enemyId; this._targetWord = word.toLowerCase(); this._typed = ''; this._wordHadError = false;
      Bridge.setState({ targetId: enemyId, activeWord: { word, typed: '' } });
    }
  }
  _onEnemyCollapsed({ id }) { if (id === this._targetId) this.clearTarget(); }
  _updateFlow(delta) {
    if (this._flowActive) {
      this._flow = Math.max(0, this._flow - FLOW_DECAY_ACTIVE * delta);
      if (this._flow <= 0) { this._onFlowExit(); return; }
      const state = Bridge.peekState();
      const healAmt = Math.min(FLOW_HEAL_RATE * delta, PLAYER_MAX_HP - state.hp);
      if (healAmt > 0) { const newHp = state.hp + healAmt; Bridge.setState({ hp: newHp }); EventBus.emit(EventTypes.FLOW_HEAL, { amount: healAmt, hp: newHp }); }
    } else {
      const idleMs = performance.now() - this._lastKeyTime;
      if (idleMs > FLOW_IDLE_THRESHOLD_MS && this._flow > 0)
        this._flow = Math.max(0, this._flow - FLOW_DECAY_IDLE * delta);
    }
    this._flowProgressAcc += delta;
    if (this._flowProgressAcc >= 1 / FLOW_PUBLISH_HZ) {
      this._flowProgressAcc = 0;
      Bridge.setState({ flow: this._flow, flowActive: this._flowActive });
      EventBus.emit(EventTypes.FLOW_PROGRESS, { value: this._flow, active: this._flowActive });
    }
  }
  _addFlow(amount) {
    if (amount > 0 && this._flowActive) amount *= 0.4;
    const prev = this._flow;
    this._flow = Math.max(0, Math.min(FLOW_MAX, this._flow + amount));
    if (!this._flowActive && !this._flowCooldown && prev < FLOW_MAX && this._flow >= FLOW_MAX)
      this._onFlowEnter();
  }
  _onFlowEnter() {
    this._flowActive = true; this._flowEnterTime = performance.now(); this._flowWordsTyped = 0;
    Bridge.setState({ flow: FLOW_MAX, flowActive: true });
    playSfx('flow.unlocked');
    EventBus.emit(EventTypes.FLOW_ENTER, { wpm: this._calcWPM() });
  }
  _onFlowExit() {
    const duration = (performance.now() - this._flowEnterTime) / 1000;
    this._flowActive = false; this._flow = 0; this._flowCooldown = true;
    playSfx('flow.break');
    Bridge.setState({ flow: 0, flowActive: false, flowCooldown: true });
    EventBus.emit(EventTypes.FLOW_EXIT, { duration, wordsTyped: this._flowWordsTyped });
    if (this._flowCooldownTimer) clearTimeout(this._flowCooldownTimer);
    this._flowCooldownTimer = setTimeout(() => {
      this._flowCooldown = false; this._flowCooldownTimer = null;
      Bridge.setState({ flowCooldown: false });
    }, FLOW_COOLDOWN_MS);
  }
  _wpmModifier() {
    const wpm = this._calcWPM();
    if (wpm < 30) return 0.6; if (wpm < 60) return 1.0; if (wpm < 90) return 1.4; return 1.8;
  }
  _calcWPM() {
    const now = performance.now(); const cutoff = now - WPM_WINDOW_MS;
    const recent = this._keyLog.filter(e => e.correct && e.timestamp >= cutoff);
    if (recent.length < WPM_MIN_CHARS) return 0;
    return Math.round((recent.length / 5) / (WPM_WINDOW_MS / 60000));
  }
  _calcAccuracy() {
    if (this._totalKeys === 0) return 100;
    return Math.round((this._correctKeys / this._totalKeys) * 100);
  }
}