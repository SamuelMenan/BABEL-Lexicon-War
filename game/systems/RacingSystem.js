import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import {
  WORD_POOL_ES,
  WORDS_PER_MINUTE_SCALE,
  RACE_TARGET_DISTANCE,
  RACE_TIME_LIMIT,
  FLOW_STEPS,
} from '../../shared/constants.js';

export class RacingSystem {
  constructor(lexicon) {
    this._lexicon         = lexicon;
    this._distance        = 0;
    this._targetDistance  = RACE_TARGET_DISTANCE;
    this._timeLimit       = RACE_TIME_LIMIT;
    this._timeElapsed     = 0;
    this._flowStreak      = 0;
    this._flowMultiplier  = 1.0;
    this._peakWPM         = 0;
    this._wordQueue       = [];
    this._wordIndex       = 0;
    this._active          = false;
    this._finished        = false;
    this._unsubs          = [];
  }

  init() {
    // Deterministic word queue — loop pool 3x for enough words
    this._wordQueue = [...WORD_POOL_ES, ...WORD_POOL_ES, ...WORD_POOL_ES];
    this._wordIndex = 0;
    this._active    = true;
    this._finished  = false;

    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED,  () => this._onWordCompleted()),
      EventBus.on(EventTypes.WORD_PROGRESS,   (p) => this._onWordProgress(p)),
    );

    Bridge.setState({
      distanceTraveled: 0,
      targetDistance:   this._targetDistance,
      flowMultiplier:   1.0,
      timeRemaining:    this._timeLimit,
      flowStreak:       0,
    });

    // Set first word after lexicon clears from previous game
    setTimeout(() => this._nextWord(), 0);
  }

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._unsubs  = [];
    this._active  = false;
    this._lexicon.clearTarget();
  }

  update(delta) {
    if (!this._active || this._finished) return;

    this._timeElapsed += delta;

    const wpm = Bridge.getState().wpm;
    if (wpm > this._peakWPM) this._peakWPM = wpm;

    const velocity = (wpm / WORDS_PER_MINUTE_SCALE) * this._flowMultiplier * delta;
    this._distance += velocity;

    const timeRemaining = Math.max(0, this._timeLimit - this._timeElapsed);

    Bridge.setState({
      distanceTraveled: Math.min(Math.round(this._distance), this._targetDistance),
      flowMultiplier:   this._flowMultiplier,
      timeRemaining:    Math.round(timeRemaining),
      flowStreak:       this._flowStreak,
    });

    if (this._distance >= this._targetDistance) {
      this._onVictory();
    } else if (this._timeElapsed >= this._timeLimit) {
      this._onDefeat();
    }
  }

  getDistance()        { return this._distance; }
  getFlowMultiplier()  { return this._flowMultiplier; }

  _nextWord() {
    if (this._wordIndex >= this._wordQueue.length) this._wordIndex = 0;
    const word = this._wordQueue[this._wordIndex++];
    this._lexicon.setTarget('race_' + this._wordIndex, word);
  }

  _onWordCompleted() {
    this._flowStreak++;
    this._updateFlowMultiplier();
    // Defer so lexicon.clearTarget() runs first, then we set next word
    setTimeout(() => { if (this._active && !this._finished) this._nextWord(); }, 0);
  }

  _onWordProgress({ correct }) {
    if (!correct) {
      this._flowStreak    = 0;
      this._flowMultiplier = 1.0;
    }
  }

  _updateFlowMultiplier() {
    let mult = 1.0;
    for (const [minStreak, m] of FLOW_STEPS) {
      if (this._flowStreak >= minStreak) mult = m;
    }
    this._flowMultiplier = mult;
  }

  _onVictory() {
    this._finished = true;
    this._active   = false;
    const state = Bridge.getState();
    EventBus.emit(EventTypes.RACE_COMPLETED, {
      distance: this._distance,
      time:     this._timeElapsed,
      wpm:      state.wpm,
      peakWPM:  this._peakWPM,
      accuracy: state.accuracy,
    });
    EventBus.emit(EventTypes.GAME_OVER, {
      raceVictory:  true,
      score:        Math.round(this._distance),
      wpm:          state.wpm,
      accuracy:     state.accuracy,
      peakWPM:      this._peakWPM,
      timeElapsed:  Math.round(this._timeElapsed),
    });
  }

  _onDefeat() {
    this._finished = true;
    this._active   = false;
    const state = Bridge.getState();
    EventBus.emit(EventTypes.RACE_FAILED, {
      distance:       this._distance,
      targetDistance: this._targetDistance,
      timeElapsed:    this._timeElapsed,
    });
    EventBus.emit(EventTypes.GAME_OVER, {
      raceVictory: false,
      score:       Math.round(this._distance),
      wpm:         state.wpm,
      accuracy:    state.accuracy,
    });
  }
}
