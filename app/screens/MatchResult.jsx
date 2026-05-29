import React, { useState, useEffect, useRef } from "react";
import KeyboardNavigable from "../ui/KeyboardNavigable.jsx";
import { Bridge } from "@shared/state/bridge.js";
import { loadProfile } from "@shared/services/playerProfile.js";
import { saveMatchResult } from "@game/net/supabase/leaderboard.js";
import { proposeRematch } from "@game/net/online/rematchCoordinator.js";
import useTranslation from "@shared/i18n/useTranslation.js";

function ResultActions({ onMenu, onRetry, onlineEnabled }) {
  const { t } = useTranslation();
  const items = [
    {
      id: 'menu',
      label: onlineEnabled ? t('matchResult.exit') : t('matchResult.menu'),
      variant: 'secondary',
      action: onMenu,
    },
    {
      id: 'retry',
      label: onlineEnabled ? t('matchResult.rematch') : t('matchResult.retry'),
      variant: 'primary',
      action: onRetry,
    },
  ];
  return (
    <KeyboardNavigable
      items={items}
      orientation="horizontal"
      onActivate={(it) => it.action()}
      initialIndex={1}
      className="mr__actions"
    >
      {(it, { focused, activate }) => (
        <button type="button"
          key={it.id}
          className={`mr__btn mr__btn--${it.variant}${focused ? ' mr__btn--focused' : ''}`}
          onClick={activate}
          onMouseEnter={(e) => e.currentTarget.focus()}
        >
          {it.label}
        </button>
      )}
    </KeyboardNavigable>
  );
}

function calcGrade(wpm, accuracy) {
  const w = wpm ?? 0;
  const a = accuracy ?? 0;
  if (w >= 80 && a >= 95) return 'S';
  if (w >= 60 && a >= 88) return 'A';
  if (w >= 45 && a >= 78) return 'B';
  if (w >= 30 && a >= 65) return 'C';
  return 'D';
}

function genSessionId() {
  return 'NRX-' + Math.floor(Date.now() / 1000).toString(16).slice(-6).toUpperCase();
}

function AnimatedBar({ pct, variant }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 100)), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="mr__bar-track">
      <div
        className={`mr__bar-fill${variant ? ` mr__bar-fill--${variant}` : ''}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function StatPanel({ label, value, sub, dim }) {
  return (
    <div className="mr__stat-panel">
      <span className="mr__stat-label">{label}</span>
      <span className={`mr__stat-value${dim ? ' mr__stat-value--dim' : ''}`}>{value}</span>
      {sub && <span className="mr__stat-sub">{sub}</span>}
    </div>
  );
}

function GrafemaBreakdown({ reward }) {
  const { t } = useTranslation();
  if (!reward || !reward.amount) return null;
  const b = reward.breakdown || {};
  const rows = [
    [t('matchResultExtra.rewardRaceCompleted'), b.base],
    [t('matchResultExtra.rewardWpmPeak', { wpm: b.wpm ?? '' }), b.bWpm],
    [t('matchResultExtra.rewardAccuracy', { pct: b.accuracy != null ? Math.round(b.accuracy * 100) : '' }), b.bAcc],
    [t('matchResultExtra.rewardPosition', { pos: b.position ?? '--' }), b.bPos],
  ].filter(([, v]) => v > 0);

  return (
    <div className="mr__grafemas">
      <div className="mr__grafemas-title">{t('matchResultExtra.rewardTitle')}</div>
      <div className="mr__grafemas-rows">
        {rows.map(([label, val]) => (
          <div key={label} className="mr__grafemas-row">
            <span className="mr__grafemas-label">{label}</span>
            <span className="mr__grafemas-val">+{val}</span>
          </div>
        ))}
        <div className="mr__grafemas-row mr__grafemas-row--total">
          <span className="mr__grafemas-label">{t('matchResultExtra.rewardTotal')}</span>
          <span className="mr__grafemas-val">+{reward.amount} ₲</span>
        </div>
      </div>
    </div>
  );
}

export default function MatchResult({
  score, wpm, accuracy, wave,
  raceVictory, peakWPM, timeElapsed, gameMode,
  wordsDestroyed, bestCombo,
  grafemasReward,
  distanceTraveled,
  onlineEnabled, onlineOpponentStats, onlineRole,
}) {
  const { t } = useTranslation();
  const isRacing = gameMode === "racing";
  const sessionId = useRef(genSessionId()).current;
  const syncOnce = useRef(false);
  // En online, "restart" = proponer revancha. Esperamos createRoom + broadcast
  // ANTES de salir al menu, asi MainMenu monta con onlinePendingRoom seteado
  // y abre RoomScreen inmediato. Antes (sin await) MainMenu llegaba antes que
  // la sala existiera → quedaba en menu principal.
  const restart = async () => {
    if (onlineEnabled) {
      try { await proposeRematch(); } catch { /* ignore */ }
      Bridge.commands.exitToMenu();
    } else {
      Bridge.commands.exitToHangar();
    }
  };
  const toMenu  = () => Bridge.commands.exitToMenu();

  const effectiveWpm = wpm ?? 0;
  const effectiveAcc = accuracy ?? 0;
  // Display value: distingue null (sin dato) de 0 (typed nada). null → '--', 0 → 0.
  const wpmDisplay = (wpm == null) ? '--' : wpm;
  // Grade uses peak when final WPM decayed to 0 (no typing in last 5s before
  // race timeout / death cinematic). Avoids always-D on otherwise good runs.
  const gradeWpm = effectiveWpm > 0 ? effectiveWpm : (peakWPM ?? 0);
  const grade = calcGrade(gradeWpm, effectiveAcc);
  const gradeClass = `mr__grade--${grade.toLowerCase()}`;

  const wpmPct  = Math.min(effectiveWpm / 120 * 100, 100);
  const accPct  = effectiveAcc;

  function wpmVariant(pct) {
    if (pct >= 66) return 'victory';
    if (pct >= 33) return null;
    return 'danger';
  }

  function accVariant(pct) {
    if (pct >= 85) return 'victory';
    if (pct >= 60) return 'warning';
    return 'danger';
  }

  function fmtTime(s) {
    if (s == null) return '--';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  useEffect(() => {
    if (syncOnce.current) return;
    syncOnce.current = true;

    const elapsedSeconds = Number.isFinite(timeElapsed) ? Math.max(0, Math.round(timeElapsed)) : null;
    const finishedAt = new Date().toISOString();
    const startedAt = elapsedSeconds == null ? null : new Date(Date.now() - elapsedSeconds * 1000).toISOString();

    void saveMatchResult({
      profile: loadProfile(),
      sessionId,
      mode: gameMode || (isRacing ? 'racing' : 'combat'),
      startedAt,
      finishedAt,
      score: Number.isFinite(score) ? score : null,
      wpm: Number.isFinite(wpm) ? wpm : null,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      wave: Number.isFinite(wave) ? wave : null,
      raceVictory,
      peakWPM: Number.isFinite(peakWPM) ? peakWPM : null,
      timeElapsed: elapsedSeconds,
      grafemasReward: Number.isFinite(grafemasReward?.amount) ? grafemasReward.amount : null,
      wordsDestroyed: Number.isFinite(wordsDestroyed) ? wordsDestroyed : null,
      bestCombo:      Number.isFinite(bestCombo)      ? bestCombo      : null,
    }).catch((error) => {
      console.warn('[Supabase] No se pudo guardar el resultado', error);
    });
  }, [accuracy, bestCombo, gameMode, grafemasReward, isRacing, peakWPM, raceVictory, score, sessionId, timeElapsed, wave, wordsDestroyed, wpm]);

  /* ── Combat ──────────────────────────────────────────────── */
  if (!isRacing) {
    const isStable = effectiveAcc >= 75 && (wave ?? 0) >= 2;
    const coreStatus = isStable ? 'STABLE' : 'CRITICAL';

    return (
      <div className="mr">
        <div className="mr__board">

          {/* Header */}
          <div className="mr__header">
            <span className="mr__header-label">{t('matchResultExtra.combatHeader')}</span>
            <span className="mr__header-id">SES:{sessionId}</span>
          </div>

          {/* Title row */}
          <div className="mr__title-row">
            <div>
              <h1 className="mr__title mr__title--defeat">{t('matchResultExtra.combatTitle')}</h1>
              <span className={`mr__core mr__core--${coreStatus.toLowerCase()}`}>
                ◈ {t('matchResultExtra.coreLabel')}: {coreStatus}
              </span>
            </div>
            <div className="mr__grade-wrap">
              <span className={`mr__grade ${gradeClass}`}>{grade}</span>
              <span className="mr__grade-label">{t('matchResult.grade')}</span>
            </div>
          </div>

          {/* Stats grid — 3 cols × 2 rows */}
          <div className="mr__stats">
            <StatPanel
              label={t('matchResult.waveReached')}
              value={wave ?? '--'}
              sub={t('matchResultExtra.subLastDefense')}
            />
            <StatPanel
              label={t('matchResult.wpmAvg')}
              value={wpmDisplay}
              sub={t('matchResultExtra.subAvgPerMin')}
            />
            <StatPanel
              label={t('matchResult.accuracy')}
              value={accuracy != null ? `${accuracy}%` : '--'}
              sub={t('matchResultExtra.subImpactIndex')}
            />
            <StatPanel
              label={t('matchResult.wordsDestroyed')}
              value={wordsDestroyed ?? '--'}
              sub={t('matchResultExtra.subLexemesNeutralized')}
              dim
            />
            <StatPanel
              label={t('matchResult.bestCombo')}
              value={bestCombo ?? '--'}
              sub={t('matchResultExtra.subMaxChain')}
              dim
            />
            <StatPanel
              label={t('matchResult.timeFlight')}
              value={fmtTime(timeElapsed)}
              sub={t('matchResultExtra.subOperationalDuration')}
              dim
            />
          </div>

          {/* Bar stats */}
          <div className="mr__bar-stats">
            <div className="mr__bar-row">
              <span className="mr__bar-name">{t('matchResultExtra.speedWpm')}</span>
              <AnimatedBar pct={wpmPct} variant={wpmVariant(wpmPct)} />
              <span className="mr__bar-val">{effectiveWpm || '--'}</span>
            </div>
            <div className="mr__bar-row">
              <span className="mr__bar-name">{t('matchResult.accuracy')}</span>
              <AnimatedBar pct={accPct} variant={accVariant(accPct)} />
              <span className="mr__bar-val">{accuracy != null ? `${accuracy}%` : '--'}</span>
            </div>
          </div>

          {/* Bottom */}
          <div className="mr__bottom">
            <p className="mr__quote">
              {t('matchResultExtra.quoteLine1')}<br />{t('matchResultExtra.quoteLine2')}
            </p>
            <ResultActions onMenu={toMenu} onRetry={restart} onlineEnabled={false} />
          </div>

        </div>
      </div>
    );
  }

  /* ── Online verdict (calculado a partir de WPM Medio local vs rival) ── */
  let onlineVerdict = null;
  if (onlineEnabled) {
    const localAvg  = wpm ?? 0;
    const remoteAvg = onlineOpponentStats?.avgWpm ?? 0;
    if (localAvg > remoteAvg) onlineVerdict = { kind: 'win',  label: t('matchResult.win') };
    else if (remoteAvg > localAvg) onlineVerdict = { kind: 'lose', label: t('matchResult.lose') };
    else onlineVerdict = { kind: 'draw', label: t('matchResult.draw') };
  }

  /* ── Racing ──────────────────────────────────────────────── */
  const peak = peakWPM || effectiveWpm;
  const peakPct = Math.min(peak / 120 * 100, 100);
  // En online el "raceVictory" offline (player vs IA opponent) no aplica —
  // ganador real lo decide WPM Medio vs rival humano (onlineVerdict).
  let titleText, titleClass, txStatus;
  if (onlineEnabled && onlineVerdict) {
    titleText  = onlineVerdict.label;
    titleClass = onlineVerdict.kind === 'win'  ? 'mr__title--victory'
              : onlineVerdict.kind === 'draw' ? 'mr__title--defeat'
              : 'mr__title--defeat';
    txStatus   = onlineVerdict.kind === 'win' ? t('matchResultExtra.txWon') : onlineVerdict.kind === 'draw' ? t('matchResultExtra.txDraw') : t('matchResultExtra.txLost');
  } else {
    titleText  = raceVictory ? t('matchResult.victoryRace') : t('matchResult.defeatRace');
    titleClass = raceVictory ? 'mr__title--victory' : 'mr__title--defeat';
    txStatus   = raceVictory ? t('matchResultExtra.txCompleted') : t('matchResultExtra.txInterrupted');
  }

  return (
    <div className="mr">
      <div className="mr__board">

        {/* Header */}
        <div className="mr__header">
          <span className="mr__header-label">{t('matchResultExtra.racingHeader')}</span>
          <span className="mr__header-id">SES:{sessionId}</span>
        </div>

        {/* Online verdict banner — solo sub-info, titulo principal ya muestra GANASTE/PERDISTE */}
        {onlineVerdict && (
          <div className={`mr__online-banner mr__online-banner--${onlineVerdict.kind}`}>
            <span className="mr__online-banner__sub">
              {t('matchResultExtra.onlineVerdictSub', { my: wpm ?? '--', rival: onlineOpponentStats?.avgWpm ?? '--' })}
            </span>
          </div>
        )}

        {/* Title row */}
        <div className="mr__title-row">
          <div>
            <h1 className={`mr__title ${titleClass}`}>{titleText}</h1>
            <span className={`mr__core mr__core--${raceVictory ? 'stable' : 'critical'}`}>
              ◈ {t('matchResultExtra.transmission')}: {txStatus}
            </span>
          </div>
          <div className="mr__grade-wrap">
            <span className={`mr__grade ${gradeClass}`}>{grade}</span>
            <span className="mr__grade-label">{t('matchResult.grade')}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mr__stats">
          <StatPanel
            label={t('matchResult.distance')}
            value={<>{distanceTraveled ?? 500}<span style={{ fontSize: '1rem' }}> / 500</span></>}
            sub={t('matchResultExtra.subUnitsTraveled')}
          />
          <StatPanel
            label={t('matchResult.wpmPeak')}
            value={peak || '--'}
            sub={t('matchResultExtra.subMaxSpeed')}
          />
          <StatPanel
            label={t('matchResult.accuracy')}
            value={accuracy != null ? `${accuracy}%` : '--'}
            sub={t('matchResultExtra.subImpactIndex')}
          />
          <StatPanel
            label={t('matchResult.wpmAvg')}
            value={wpmDisplay}
            sub={t('matchResultExtra.subAvgPerMin')}
            dim
          />
          <StatPanel
            label={t('matchResult.timeFlight')}
            value={fmtTime(timeElapsed)}
            sub={t('matchResultExtra.subOperationalDuration')}
            dim
          />
          <StatPanel
            label={t('matchResult.grade')}
            value={<span className={gradeClass} style={{ fontSize: '2rem' }}>{grade}</span>}
            sub={t('matchResultExtra.subOverallPerf')}
            dim
          />
        </div>

        {/* Bar stats */}
        <div className="mr__bar-stats">
          <div className="mr__bar-row">
            <span className="mr__bar-name">{t('matchResult.wpmPeak')}</span>
            <AnimatedBar pct={peakPct} variant={wpmVariant(peakPct)} />
            <span className="mr__bar-val">{peak || '--'}</span>
          </div>
          <div className="mr__bar-row">
            <span className="mr__bar-name">{t('matchResult.accuracy')}</span>
            <AnimatedBar pct={accPct} variant={accVariant(accPct)} />
            <span className="mr__bar-val">{accuracy != null ? `${accuracy}%` : '--'}</span>
          </div>
        </div>

        <GrafemaBreakdown reward={grafemasReward} />

        {/* Bottom */}
        <div className="mr__bottom">
          <p className="mr__quote">
            {t('matchResultExtra.quoteLine1')}<br />{t('matchResultExtra.quoteLine2')}
          </p>
          <ResultActions onMenu={toMenu} onRetry={restart} onlineEnabled={onlineEnabled} />
        </div>

      </div>
    </div>
  );
}
