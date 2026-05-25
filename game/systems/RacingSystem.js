import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { playSfx, playLoopSfx, stopLoopSfx, playBgm } from '../../shared/audioManager.js';
import { EconomySystem } from './EconomySystem.js';
import { computeRaceReward } from './GrafemaRewards.js';
import {
  PHRASE_POOL_ES,
  PHRASE_POOL_EN,
  RACE_COUNTDOWN_SECS,
  RACE_DURATION,
  RACE_TARGET_DISTANCE,
  RACE_OPPONENT_WPM,
  FLOW_STEPS,
} from '../../shared/constants.js';
import { getLocale } from '../../shared/i18n/index.js';

const BUFFER_SIZE    = 300; // visible word pool (90s × 120 WPM = 180 words max)
const REFILL_AT      = 60;  // refill when fewer than this many words remain ahead

function activePool() {
  return getLocale() === 'en' ? PHRASE_POOL_EN : PHRASE_POOL_ES;
}

const AVG_WORDS_ES = PHRASE_POOL_ES.reduce((s, p) => s + p.length, 0) / PHRASE_POOL_ES.length;
// opponent phrases completed per second — use ES baseline (similar in EN)
const OPP_PHRASES_PER_SEC = (RACE_OPPONENT_WPM / 60) / AVG_WORDS_ES;

/** Flat word array from a shuffled copy of the pool. */
function buildWordStream() {
  const pool = [...activePool()];
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

  init({ deferStart = false } = {}) {
    this._stream         = buildWordStream();
    this._streamIdx      = 0;
    this._wordBuffer     = [];
    this._globalIdx      = 0;
    this._wordsCompleted = 0;
    this._playerDone     = 0;
    this._oppDone        = 0;
    this._countdown      = RACE_COUNTDOWN_SECS;
    this._countdownActive = !deferStart;
    this._active         = false;
    this._finished       = false;
    this._flowStreak     = 0;
    this._flowMultiplier = 1.0;
    this._peakWPM        = 0;
    this._timeElapsed    = 0;
    this._lastWarnSec    = 11;
    this._lastMilestone  = 0;
    this._photoFinishFired = false;
    this._consecutiveCorrect = 0;
    this._finalStretchBgmFired = false;
    this._raceBgmFired = false;

    playLoopSfx('raceengine.engine_loop', 0.5);

    // Pre-fill buffer
    this._fillBuffer();

    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED, () => this._onWordCompleted()),
      EventBus.on(EventTypes.WORD_PROGRESS,  (p) => this._onWordProgress(p)),
    );

    Bridge.setState({
      countdown:              RACE_COUNTDOWN_SECS,
      countdownActive:        this._countdownActive,
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

  armCountdown() {
    if (this._countdownActive || this._active) return;
    this._countdown = RACE_COUNTDOWN_SECS;
    this._countdownActive = true;
    Bridge.setState({ countdown: RACE_COUNTDOWN_SECS, countdownActive: true });
  }

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._unsubs  = [];
    this._active  = false;
    stopLoopSfx('raceengine.engine_loop');
    this._lexicon.clearTarget();
  }

  update(delta) {
    if (this._finished) return;

    if (this._countdownActive) {
      const prevTick = Math.max(0, Math.ceil(this._countdown));
      this._countdown -= delta;
      const nextTick = Math.max(0, Math.ceil(this._countdown));
      // SFX countdown ahora canonical en Countdown.jsx (UI source of truth).
      this._stateCountdown.countdown = nextTick;
      Bridge.setState(this._stateCountdown);
      if (this._countdown <= 0) {
        this._countdownActive = false;
        this._active = true;
        playBgm('bgm.race');
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
    // Distancia del rival = ritmo opponent constante, llega a target al final de duracion.
    this._stateMain.opponentDistance       = Math.round(
      (this._oppDone / (OPP_PHRASES_PER_SEC * RACE_DURATION)) * RACE_TARGET_DISTANCE,
    );
    this._stateMain.timeRemaining          = timeRemaining;
    this._stateMain.flowMultiplier         = this._flowMultiplier;
    this._stateMain.flowStreak             = this._flowStreak;
    Bridge.setState(this._stateMain);

    // time_warning: integer crossings ≤10
    const tSec = Math.ceil(timeRemaining);
    if (tSec <= 10 && tSec >= 1 && tSec < this._lastWarnSec) {
      this._lastWarnSec = tSec;
      playSfx('race.time_warning');
    }
    // milestone: cross 100,200,300,400
    const dist = this._stateMain.distanceTraveled;
    const ms = Math.floor(dist / 100) * 100;
    if (ms >= 100 && ms > this._lastMilestone && ms < RACE_TARGET_DISTANCE) {
      this._lastMilestone = ms;
      playSfx('race.milestone');
    }
    // final stretch BGM: ultimos 100m antes del target
    if (dist >= RACE_TARGET_DISTANCE - 100) {
      playBgm('bgm.final_stretch');
    }
    // photo finish: near target + tight gap
    if (!this._photoFinishFired && dist > RACE_TARGET_DISTANCE - 50) {
      const rival = this._stateMain.opponentDistance ?? 0;
      if (Math.abs(dist - rival) <= 20) {
        this._photoFinishFired = true;
        playSfx('race.photo_finish');
      }
    }

    // Emit local tick for online sync (no-op si offline; broadcast escucha).
    this._broadcastAcc = (this._broadcastAcc ?? 0) + delta;
    if (this._broadcastAcc >= 0.1) {  // 10Hz
      this._broadcastAcc = 0;
      const state = Bridge.peekState();
      if (state.onlineEnabled) {
        const minutes  = Math.max(this._timeElapsed / 60, 1 / 60);
        const correct  = this._lexicon?.getCorrectKeys?.() ?? 0;
        const liveAvgWpm = correct > 0 ? Math.round((correct / 5) / minutes) : 0;
        EventBus.emit('online:race_tick_local', {
          wpm:         state.wpm ?? 0,
          avgWpm:      liveAvgWpm,
          distance:    this._stateMain.distanceTraveled,
          phrasesDone: this._playerDone,
          accuracy:    state.accuracy ?? 0,
          peakWpm:     this._peakWPM,
        });
      }
    }

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
    this._consecutiveCorrect = (this._consecutiveCorrect ?? 0) + 1;
    playSfx('race.phrase_done');
    if (this._consecutiveCorrect % 5 === 0) playSfx('race.boost_streak');
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
      this._consecutiveCorrect = 0;
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

    // WPM Medio (estandar competitivo): (correctChars / 5) / minutos.
    // Metrica primaria para modo online. Convencion: 5 chars = 1 word.
    // Fallback en cascada:
    //  1) correctChars / 5 / minutos    (mas exacto)
    //  2) wordsCompleted / minutos      (si lexicon no expone keys o reset bug)
    //  3) peakWPM                       (ultimo recurso, sigue siendo numero real)
    const minutesElapsed = Math.max(this._timeElapsed / 60, 1 / 60); // minimo 1s para no dividir por casi-cero
    const correctKeys    = this._lexicon?.getCorrectKeys?.() ?? 0;
    const fromKeys  = correctKeys > 0       ? Math.round((correctKeys / 5) / minutesElapsed) : 0;
    const fromWords = this._wordsCompleted > 0 ? Math.round(this._wordsCompleted / minutesElapsed) : 0;
    const avgWpm    = fromKeys > 0 ? fromKeys
                    : fromWords > 0 ? fromWords
                    : (this._peakWPM > 0 ? this._peakWPM : null);
    const state2 = Bridge.peekState();
    const payload = {
      raceVictory: victory,
      // Race: `score` = phrases completed (mode-specific semantic; see B3 note).
      score:       this._playerDone,
      // Distancia visual de UI — siempre llega a RACE_TARGET_DISTANCE al cierre.
      distanceTraveled: state2.distanceTraveled ?? RACE_TARGET_DISTANCE,
      wave:        null,
      // wpm = WPM Medio del match (estandar mecanografia). Reemplaza el antiguo
      // "WPM Final" que usaba la ventana rolling de 5s (poco fiable).
      wpm:         avgWpm,
      accuracy:    state.accuracy,   // 0-100 percent (DB column matches)
      // Peak nunca inferior al medio. Garantiza coherencia visual y de DB.
      peakWPM:     Math.max(this._peakWPM || 0, avgWpm || 0) || null,
      timeElapsed: Math.round(this._timeElapsed),
      grafemasReward,
    };

    // Online: broadcast resultado final + flag para que UI resuelva ganador.
    if (state2.onlineEnabled) {
      EventBus.emit('online:race_finish_local', {
        avgWpm:   avgWpm ?? 0,
        accuracy: state.accuracy ?? 0,
        peakWpm:  this._peakWPM,
      });
      payload.online = {
        role:           state2.onlineRole,
        roomId:         state2.onlineRoom?.id,
        localAvgWpm:    avgWpm ?? 0,
        localAccuracy:  state.accuracy ?? 0,
      };
    }

    playSfx(victory ? 'raceend.victory' : 'raceend.defeat');
    playBgm(victory ? 'bgm.victory' : 'bgm.defeat');
    const evType = victory ? EventTypes.RACE_COMPLETED : EventTypes.RACE_FAILED;
    EventBus.emit(evType, {
      winner:          victory ? 'player' : 'opponent',
      gameOverPayload: payload,
    });
  }
}
