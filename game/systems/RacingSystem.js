import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { EconomySystem } from './EconomySystem.js';
import { computeRaceReward } from './GrafemaRewards.js';
import {
  PHRASE_POOL_ES,
  RACE_COUNTDOWN_SECS,
  RACE_DURATION,
  RACE_TARGET_DISTANCE,
  RACE_OPPONENT_WPM,
  FLOW_STEPS,
} from '../../shared/constants.js';

const BUFFER_SIZE    = 300; // visible word pool (90s × 120 WPM = 180 words max)
const REFILL_AT      = 60;  // refill when fewer than this many words remain ahead

const AVG_WORDS = PHRASE_POOL_ES.reduce((s, p) => s + p.length, 0) / PHRASE_POOL_ES.length;
// opponent phrases completed per second
const OPP_PHRASES_PER_SEC = (RACE_OPPONENT_WPM / 60) / AVG_WORDS;

/** Flat word array from a shuffled copy of the pool. */
function buildWordStream() {
  const pool = [...PHRASE_POOL_ES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // flatten all phrases into one word list, repeated 6x so we never run out
  return [...pool, ...pool, ...pool, ...pool, ...pool, ...pool].flat();
}

export class RacingSystem {
  constructor(lexicon) {
    this._lexicon = lexicon;

    // Continuous word buffer
    this._stream        = [];   // infinite word source
    this._streamIdx     = 0;   // next word to pull from _stream
    this._wordBuffer    = [];   // currently displayed buffer (slice shown to UI)
    this._globalIdx     = 0;   // index into _wordBuffer of current word
    this._wordsCompleted = 0;

    this._playerDone    = 0;
    this._oppDone       = 0;

    this._countdown       = RACE_COUNTDOWN_SECS;
    this._countdownActive = false;
    this._active          = false;
    this._finished        = false;

    this._flowStreak     = 0;
    this._flowMultiplier = 1.0;
    this._peakWPM        = 0;
    this._timeElapsed    = 0;

    this._unsubs = [];

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
    this._stream         = buildWordStream();
    this._streamIdx      = 0;
    this._wordBuffer     = [];
    this._globalIdx      = 0;
    this._wordsCompleted = 0;
    this._playerDone     = 0;
    this._oppDone        = 0;
    this._countdown      = RACE_COUNTDOWN_SECS;
    this._countdownActive = true;
    this._active         = false;
    this._finished       = false;
    this._flowStreak     = 0;
    this._flowMultiplier = 1.0;
    this._peakWPM        = 0;
    this._timeElapsed    = 0;

    // Pre-fill buffer
    this._fillBuffer();

    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED, () => this._onWordCompleted()),
      EventBus.on(EventTypes.WORD_PROGRESS,  (p) => this._onWordProgress(p)),
    );

    Bridge.setState({
      countdown:              RACE_COUNTDOWN_SECS,
      countdownActive:        true,
      phraseProgress:         0,
      opponentPhraseProgress: 0,
      totalPhrases:           null,
      playerPhrasesCompleted: 0,
      wordsCompleted:         0,
      distanceTraveled:       0,
      targetDistance:         RACE_TARGET_DISTANCE,
      timeRemaining:          RACE_DURATION,
      flowMultiplier:         1.0,
      flowStreak:             0,
      wordBuffer:             this._wordBuffer.slice(),
      globalWordIndex:        0,
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

  /** Pull words from stream into _wordBuffer until it has BUFFER_SIZE words. */
  _fillBuffer() {
    while (this._wordBuffer.length < BUFFER_SIZE && this._streamIdx < this._stream.length) {
      this._wordBuffer.push(this._stream[this._streamIdx++]);
    }
  }

  _setWord() {
    const word = this._wordBuffer[this._globalIdx];
    if (!word) {
      console.warn('[RacingSystem] _setWord: buffer exhausted at', this._globalIdx);
      return;
    }
    this._lexicon.setTarget(`race_${this._globalIdx}`, word);
  }

  _onWordCompleted() {
    this._flowStreak++;
    this._wordsCompleted++;
    this._playerDone++;
    this._updateFlow();

    this._globalIdx++;

    // Refill look-ahead when running low
    const remaining = this._wordBuffer.length - this._globalIdx;
    if (remaining < REFILL_AT) {
      this._fillBuffer();
    }

    Bridge.setState({
      globalWordIndex:        this._globalIdx,
      wordBuffer:             this._wordBuffer.slice(),
      wordsCompleted:         this._wordsCompleted,
      playerPhrasesCompleted: this._playerDone,
    });

    EventBus.emit(EventTypes.RACE_PHRASE_COMPLETED, {
      wordIndex:  this._globalIdx - 1,
      playerDone: this._playerDone,
    });

    if (this._active && !this._finished) this._setWord();
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

    let grafemasReward = null;
    if (victory) {
      const reward = computeRaceReward({
        wpm:      this._peakWPM,
        accuracy: (state.accuracy ?? 0) / 100,
        position: 1,
      });
      EconomySystem.award(reward.amount, 'race', reward.breakdown);
      grafemasReward = reward;
    }

    const payload = {
      raceVictory: victory,
      score:       this._playerDone,
      wpm:         state.wpm,
      accuracy:    state.accuracy,
      peakWPM:     this._peakWPM,
      timeElapsed: Math.round(this._timeElapsed),
      grafemasReward,
    };

    const evType = victory ? EventTypes.RACE_COMPLETED : EventTypes.RACE_FAILED;
    EventBus.emit(evType, {
      winner:          victory ? 'player' : 'opponent',
      gameOverPayload: payload,
    });
  }
}
