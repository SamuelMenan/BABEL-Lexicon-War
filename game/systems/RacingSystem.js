import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import {
  PHRASE_POOL_ES,
  RACE_PHRASE_COUNT,
  RACE_COUNTDOWN_SECS,
  RACE_TARGET_DISTANCE,
  RACE_OPPONENT_WPM,
  WORDS_PER_MINUTE_SCALE,
  FLOW_STEPS,
} from '../../shared/constants.js';

export class RacingSystem {
  constructor(lexicon) {
    this._lexicon = lexicon;

    this._phrases    = [];
    this._phraseIdx  = 0;
    this._wordIdx    = 0;

    this._playerDone = 0;
    this._oppProgress = 0;

    this._countdown       = RACE_COUNTDOWN_SECS;
    this._countdownActive = false;
    this._active          = false;
    this._finished        = false;

    this._flowStreak     = 0;
    this._flowMultiplier = 1.0;
    this._peakWPM        = 0;
    this._timeElapsed    = 0;

    // phrases/sec rate for opponent
    const avgWords = PHRASE_POOL_ES.reduce((s, p) => s + p.length, 0) / PHRASE_POOL_ES.length;
    this._oppRate = (RACE_OPPONENT_WPM / 60) / avgWords / RACE_PHRASE_COUNT;

    this._unsubs = [];
  }

  init() {
    // shuffle pool and pick RACE_PHRASE_COUNT phrases
    const pool = [...PHRASE_POOL_ES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this._phrases = Array.from({ length: RACE_PHRASE_COUNT }, (_, i) => pool[i % pool.length]);

    this._phraseIdx       = 0;
    this._wordIdx         = 0;
    this._playerDone      = 0;
    this._oppProgress     = 0;
    this._countdown       = RACE_COUNTDOWN_SECS;
    this._countdownActive = true;
    this._active          = false;
    this._finished        = false;
    this._flowStreak      = 0;
    this._flowMultiplier  = 1.0;
    this._peakWPM         = 0;
    this._timeElapsed     = 0;

    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED,  () => this._onWordCompleted()),
      EventBus.on(EventTypes.WORD_PROGRESS,   (p) => this._onWordProgress(p)),
    );

    Bridge.setState({
      countdown:              RACE_COUNTDOWN_SECS,
      countdownActive:        true,
      phraseProgress:         0,
      opponentPhraseProgress: 0,
      currentPhrase:          this._phrases[0],
      currentPhraseWordIndex: 0,
      totalPhrases:           RACE_PHRASE_COUNT,
      playerPhrasesCompleted: 0,
      distanceTraveled:       0,
      targetDistance:         RACE_TARGET_DISTANCE,
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
      Bridge.setState({ countdown: Math.max(0, Math.ceil(this._countdown)) });
      if (this._countdown <= 0) {
        this._countdownActive = false;
        this._active = true;
        Bridge.setState({ countdownActive: false, countdown: 0 });
        setTimeout(() => this._setWord(), 0);
      }
      return;
    }

    if (!this._active) return;

    this._timeElapsed += delta;

    const wpm = Bridge.getState().wpm;
    if (wpm > this._peakWPM) this._peakWPM = wpm;

    this._oppProgress = Math.min(1, this._oppProgress + this._oppRate * delta);

    // map player phrase progress → distanceTraveled for 3D scene
    const playerProgress = this._playerDone / RACE_PHRASE_COUNT;
    Bridge.setState({
      opponentPhraseProgress: this._oppProgress,
      phraseProgress:         playerProgress,
      flowMultiplier:         this._flowMultiplier,
      flowStreak:             this._flowStreak,
      distanceTraveled:       Math.round(playerProgress * RACE_TARGET_DISTANCE),
    });

    if (this._oppProgress >= 1) this._onDefeat();
  }

  _setWord() {
    if (this._phraseIdx >= this._phrases.length) return;
    const phrase = this._phrases[this._phraseIdx];
    const word   = phrase[this._wordIdx];
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
      setTimeout(() => { if (this._active && !this._finished) this._setWord(); }, 0);
    } else {
      // phrase done
      this._wordIdx = 0;
      this._phraseIdx++;
      this._playerDone++;

      Bridge.setState({ playerPhrasesCompleted: this._playerDone });
      EventBus.emit(EventTypes.RACE_PHRASE_COMPLETED, {
        phraseIndex: this._phraseIdx - 1,
        progress:    this._playerDone / RACE_PHRASE_COUNT,
      });

      if (this._playerDone >= RACE_PHRASE_COUNT) {
        this._onVictory();
      } else {
        setTimeout(() => { if (this._active && !this._finished) this._setWord(); }, 0);
      }
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

  _onVictory() {
    this._finished = true;
    this._active   = false;
    const state = Bridge.getState();
    EventBus.emit(EventTypes.RACE_COMPLETED, {
      time:     this._timeElapsed,
      wpm:      state.wpm,
      peakWPM:  this._peakWPM,
      accuracy: state.accuracy,
    });
    EventBus.emit(EventTypes.GAME_OVER, {
      raceVictory: true,
      score:       this._playerDone,
      wpm:         state.wpm,
      accuracy:    state.accuracy,
      peakWPM:     this._peakWPM,
      timeElapsed: Math.round(this._timeElapsed),
    });
  }

  _onDefeat() {
    this._finished = true;
    this._active   = false;
    const state = Bridge.getState();
    EventBus.emit(EventTypes.RACE_FAILED, {
      playerProgress: this._playerDone / RACE_PHRASE_COUNT,
      timeElapsed:    this._timeElapsed,
    });
    EventBus.emit(EventTypes.GAME_OVER, {
      raceVictory: false,
      score:       this._playerDone,
      wpm:         state.wpm,
      accuracy:    state.accuracy,
    });
  }
}
