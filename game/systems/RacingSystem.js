import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import {
  PHRASE_POOL_ES,
  RACE_COUNTDOWN_SECS,
  RACE_DURATION,
  RACE_TARGET_DISTANCE,
  RACE_OPPONENT_WPM,
  FLOW_STEPS,
} from '../../shared/constants.js';

const AVG_WORDS = PHRASE_POOL_ES.reduce((s, p) => s + p.length, 0) / PHRASE_POOL_ES.length;
// opponent phrases completed per second
const OPP_PHRASES_PER_SEC = (RACE_OPPONENT_WPM / 60) / AVG_WORDS;

export class RacingSystem {
  constructor(lexicon) {
    this._lexicon = lexicon;

    this._phrases   = [];
    this._phraseIdx = 0;
    this._wordIdx   = 0;

    this._playerDone    = 0;
    this._oppDone       = 0; // fractional opponent phrases

    this._countdown       = RACE_COUNTDOWN_SECS;
    this._countdownActive = false;
    this._active          = false;
    this._finished        = false;

    this._flowStreak     = 0;
    this._flowMultiplier = 1.0;
    this._peakWPM        = 0;
    this._timeElapsed    = 0;

    this._unsubs = [];

    // Pre-allocated partials — avoids a new object literal every frame.
    this._stateCountdown     = { countdown: 0 };
    this._stateCountdownStop = { countdownActive: false, countdown: 0 };
    this._stateMain = {
      opponentPhraseProgress: 0,
      playerPhrasesCompleted: 0,
      phraseProgress:         0,
      distanceTraveled:       0,
      timeRemaining:          0,
      flowMultiplier:         1.0,
      flowStreak:             0,
    };
  }

  init() {
    // build infinite-enough phrase queue from shuffled pool
    const pool = [...PHRASE_POOL_ES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // loop the pool 4x so we never run out in 60 seconds
    this._phrases = [...pool, ...pool, ...pool, ...pool];

    this._phraseIdx       = 0;
    this._wordIdx         = 0;
    this._playerDone      = 0;
    this._oppDone         = 0;
    this._countdown       = RACE_COUNTDOWN_SECS;
    this._countdownActive = true;
    this._active          = false;
    this._finished        = false;
    this._flowStreak      = 0;
    this._flowMultiplier  = 1.0;
    this._peakWPM         = 0;
    this._timeElapsed     = 0;

    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED, () => this._onWordCompleted()),
      EventBus.on(EventTypes.WORD_PROGRESS,  (p) => this._onWordProgress(p)),
    );

    Bridge.setState({
      countdown:              RACE_COUNTDOWN_SECS,
      countdownActive:        true,
      phraseProgress:         0,
      opponentPhraseProgress: 0,
      currentPhrase:          this._phrases[0],
      currentPhraseWordIndex: 0,
      totalPhrases:           null, // time-based — no fixed total
      playerPhrasesCompleted: 0,
      distanceTraveled:       0,
      targetDistance:         RACE_TARGET_DISTANCE,
      timeRemaining:          RACE_DURATION,
      flowMultiplier:         1.0,
      flowStreak:             0,
    });
  }

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._unsubs  = [];
    this._active  = false;
    this._lexicon.clearTarget();
  }

  update(delta) {
    if (this._finished) return;

    if (this._countdownActive) {
      this._countdown -= delta;
      this._stateCountdown.countdown = Math.max(0, Math.ceil(this._countdown));
      Bridge.setState(this._stateCountdown);
      if (this._countdown <= 0) {
        this._countdownActive = false;
        this._active = true;
        Bridge.setState(this._stateCountdownStop);
        this._setWord();
      }
      return;
    }

    if (!this._active) return;

    this._timeElapsed += delta;
    const timeRemaining = Math.max(0, RACE_DURATION - this._timeElapsed);
    const timeProgress  = Math.min(1, this._timeElapsed / RACE_DURATION);

    const wpm = Bridge.peekState().wpm;
    if (wpm > this._peakWPM) this._peakWPM = wpm;

    this._oppDone += OPP_PHRASES_PER_SEC * delta;

    this._stateMain.opponentPhraseProgress = this._oppDone;
    this._stateMain.playerPhrasesCompleted = this._playerDone;
    this._stateMain.phraseProgress         = timeProgress;
    this._stateMain.distanceTraveled       = Math.round(timeProgress * RACE_TARGET_DISTANCE);
    this._stateMain.timeRemaining          = timeRemaining;
    this._stateMain.flowMultiplier         = this._flowMultiplier;
    this._stateMain.flowStreak             = this._flowStreak;
    Bridge.setState(this._stateMain);

    if (timeRemaining <= 0) this._onTimeUp();
  }

  _setWord() {
    if (this._phraseIdx >= this._phrases.length) {
      this._phrases.push(...PHRASE_POOL_ES);
    }
    const phrase = this._phrases[this._phraseIdx];
    const word   = phrase?.[this._wordIdx];
    if (!word) {
      console.warn('[RacingSystem] _setWord: no word at', this._phraseIdx, this._wordIdx);
      return;
    }
    this._lexicon.setTarget(`race_${this._phraseIdx}_${this._wordIdx}`, word);
    Bridge.setState({
      currentPhrase:          phrase,
      currentPhraseWordIndex: this._wordIdx,
    });
  }

  _onWordCompleted() {
    this._flowStreak++;
    this._updateFlow();

    const phrase = this._phrases[this._phraseIdx];
    if (this._wordIdx < phrase.length - 1) {
      this._wordIdx++;
      if (this._active && !this._finished) this._setWord();
    } else {
      this._wordIdx = 0;
      this._phraseIdx++;
      this._playerDone++;
      Bridge.setState({ playerPhrasesCompleted: this._playerDone });
      EventBus.emit(EventTypes.RACE_PHRASE_COMPLETED, {
        phraseIndex: this._phraseIdx - 1,
        playerDone:  this._playerDone,
      });
      if (this._active && !this._finished) this._setWord();
    }
  }

  _onWordProgress({ correct }) {
    if (!correct) {
      this._flowStreak     = 0;
      this._flowMultiplier = 1.0;
    }
  }

  _updateFlow() {
    let mult = 1.0;
    for (const [minStreak, m] of FLOW_STEPS) {
      if (this._flowStreak >= minStreak) mult = m;
    }
    this._flowMultiplier = mult;
  }

  _onTimeUp() {
    this._finished = true;
    this._active   = false;
    const state    = Bridge.peekState();
    const victory  = this._playerDone > Math.floor(this._oppDone);

    const payload = {
      raceVictory: victory,
      score:       this._playerDone,
      wpm:         state.wpm,
      accuracy:    state.accuracy,
      peakWPM:     this._peakWPM,
      timeElapsed: Math.round(this._timeElapsed),
    };

    const evType = victory ? EventTypes.RACE_COMPLETED : EventTypes.RACE_FAILED;
    EventBus.emit(evType, {
      winner:          victory ? 'player' : 'opponent',
      gameOverPayload: payload,
    });
  }
}
