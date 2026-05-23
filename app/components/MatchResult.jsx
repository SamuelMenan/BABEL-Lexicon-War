import React, { useState, useEffect, useRef } from "react";
import KeyboardNavigable from "./common/KeyboardNavigable.jsx";
import { loadProfile } from "../../shared/playerProfile.js";
import { saveMatchResult } from "../services/supabase/leaderboard.js";

function ResultActions({ onMenu, onRetry }) {
  const items = [
    { id: 'menu',  label: 'Menú Principal', variant: 'secondary', action: onMenu },
    { id: 'retry', label: 'Reintentar',     variant: 'primary',   action: onRetry },
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
        <button
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
  if (!reward || !reward.amount) return null;
  const b = reward.breakdown || {};
  const rows = [
    ['Carrera completada',        b.base],
    [`WPM pico ${b.wpm ?? ''}`,   b.bWpm],
    [`Precisión ${b.accuracy != null ? Math.round(b.accuracy * 100) + '%' : ''}`, b.bAcc],
    [`Posición ${b.position ?? '--'}`, b.bPos],
  ].filter(([, v]) => v > 0);

  return (
    <div className="mr__grafemas">
      <div className="mr__grafemas-title">RECOMPENSA</div>
      <div className="mr__grafemas-rows">
        {rows.map(([label, val]) => (
          <div key={label} className="mr__grafemas-row">
            <span className="mr__grafemas-label">{label}</span>
            <span className="mr__grafemas-val">+{val}</span>
          </div>
        ))}
        <div className="mr__grafemas-row mr__grafemas-row--total">
          <span className="mr__grafemas-label">Total</span>
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
}) {
  const isRacing = gameMode === "racing";
  const sessionId = useRef(genSessionId()).current;
  const syncOnce = useRef(false);
  const restart = () => window.location.reload();

  const effectiveWpm = wpm ?? 0;
  const effectiveAcc = accuracy ?? 0;
  const grade = calcGrade(effectiveWpm, effectiveAcc);
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
    }).catch((error) => {
      console.warn('[Supabase] No se pudo guardar el resultado', error);
    });
  }, [accuracy, gameMode, grafemasReward, isRacing, peakWPM, raceVictory, score, sessionId, timeElapsed, wave, wpm]);

  /* ── Combat ──────────────────────────────────────────────── */
  if (!isRacing) {
    const isStable = effectiveAcc >= 75 && (wave ?? 0) >= 2;
    const coreStatus = isStable ? 'STABLE' : 'CRITICAL';

    return (
      <div className="mr">
        <div className="mr__board">

          {/* Header */}
          <div className="mr__header">
            <span className="mr__header-label">◈ Análisis Post-Misión · Protocolo Léxico NRX</span>
            <span className="mr__header-id">SES:{sessionId}</span>
          </div>

          {/* Title row */}
          <div className="mr__title-row">
            <div>
              <h1 className="mr__title mr__title--defeat">MISIÓN TERMINADA</h1>
              <span className={`mr__core mr__core--${coreStatus.toLowerCase()}`}>
                ◈ NÚCLEO LÉXICO: {coreStatus}
              </span>
            </div>
            <div className="mr__grade-wrap">
              <span className={`mr__grade ${gradeClass}`}>{grade}</span>
              <span className="mr__grade-label">Clasificación</span>
            </div>
          </div>

          {/* Stats grid — 3 cols × 2 rows */}
          <div className="mr__stats">
            <StatPanel
              label="Oleada Alcanzada"
              value={wave ?? '--'}
              sub="ÚLTIMA DEFENSA ACTIVA"
            />
            <StatPanel
              label="WPM"
              value={effectiveWpm || '--'}
              sub="PALABRAS / MINUTO"
            />
            <StatPanel
              label="Precisión"
              value={accuracy != null ? `${accuracy}%` : '--'}
              sub="ÍNDICE DE IMPACTO"
            />
            <StatPanel
              label="Palabras Destruidas"
              value={wordsDestroyed ?? '--'}
              sub="LEXEMAS NEUTRALIZADOS"
              dim
            />
            <StatPanel
              label="Mayor Combo"
              value={bestCombo ?? '--'}
              sub="CADENA MÁXIMA"
              dim
            />
            <StatPanel
              label="Tiempo de Vuelo"
              value={fmtTime(timeElapsed)}
              sub="DURACIÓN OPERACIONAL"
              dim
            />
          </div>

          {/* Bar stats */}
          <div className="mr__bar-stats">
            <div className="mr__bar-row">
              <span className="mr__bar-name">Velocidad WPM</span>
              <AnimatedBar pct={wpmPct} variant={wpmVariant(wpmPct)} />
              <span className="mr__bar-val">{effectiveWpm || '--'}</span>
            </div>
            <div className="mr__bar-row">
              <span className="mr__bar-name">Precisión</span>
              <AnimatedBar pct={accPct} variant={accVariant(accPct)} />
              <span className="mr__bar-val">{accuracy != null ? `${accuracy}%` : '--'}</span>
            </div>
          </div>

          {/* Bottom */}
          <div className="mr__bottom">
            <p className="mr__quote">
              "Las palabras no se acaban.<br />Solo cambian de mano."
            </p>
            <ResultActions onMenu={restart} onRetry={restart} />
          </div>

        </div>
      </div>
    );
  }

  /* ── Racing ──────────────────────────────────────────────── */
  const peak = peakWPM || effectiveWpm;
  const peakPct = Math.min(peak / 120 * 100, 100);
  const titleText  = raceVictory ? 'VICTORIA' : 'TIEMPO AGOTADO';
  const titleClass = raceVictory ? 'mr__title--victory' : 'mr__title--defeat';
  const txStatus   = raceVictory ? 'COMPLETADA' : 'INTERRUMPIDA';

  return (
    <div className="mr">
      <div className="mr__board">

        {/* Header */}
        <div className="mr__header">
          <span className="mr__header-label">◈ Registro de Transmisión · Protocolo de Carrera</span>
          <span className="mr__header-id">SES:{sessionId}</span>
        </div>

        {/* Title row */}
        <div className="mr__title-row">
          <div>
            <h1 className={`mr__title ${titleClass}`}>{titleText}</h1>
            <span className={`mr__core mr__core--${raceVictory ? 'stable' : 'critical'}`}>
              ◈ TRANSMISIÓN: {txStatus}
            </span>
          </div>
          <div className="mr__grade-wrap">
            <span className={`mr__grade ${gradeClass}`}>{grade}</span>
            <span className="mr__grade-label">Clasificación</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mr__stats">
          <StatPanel
            label="Distancia"
            value={<>{score ?? '--'}<span style={{ fontSize: '1rem' }}> / 500</span></>}
            sub="UNIDADES RECORRIDAS"
          />
          <StatPanel
            label="WPM Pico"
            value={peak || '--'}
            sub="VELOCIDAD MÁXIMA"
          />
          <StatPanel
            label="Precisión"
            value={accuracy != null ? `${accuracy}%` : '--'}
            sub="ÍNDICE DE IMPACTO"
          />
          <StatPanel
            label="WPM Final"
            value={effectiveWpm || '--'}
            sub="VELOCIDAD AL CIERRE"
            dim
          />
          <StatPanel
            label="Tiempo de Vuelo"
            value={fmtTime(timeElapsed)}
            sub="DURACIÓN OPERACIONAL"
            dim
          />
          <StatPanel
            label="Clasificación"
            value={<span className={gradeClass} style={{ fontSize: '2rem' }}>{grade}</span>}
            sub="RENDIMIENTO GLOBAL"
            dim
          />
        </div>

        {/* Bar stats */}
        <div className="mr__bar-stats">
          <div className="mr__bar-row">
            <span className="mr__bar-name">WPM Pico</span>
            <AnimatedBar pct={peakPct} variant={wpmVariant(peakPct)} />
            <span className="mr__bar-val">{peak || '--'}</span>
          </div>
          <div className="mr__bar-row">
            <span className="mr__bar-name">Precisión</span>
            <AnimatedBar pct={accPct} variant={accVariant(accPct)} />
            <span className="mr__bar-val">{accuracy != null ? `${accuracy}%` : '--'}</span>
          </div>
        </div>

        <GrafemaBreakdown reward={grafemasReward} />

        {/* Bottom */}
        <div className="mr__bottom">
          <p className="mr__quote">
            "Las palabras no se acaban.<br />Solo cambian de mano."
          </p>
          <div className="mr__actions">
            <button className="mr__btn mr__btn--secondary" onClick={restart}>
              Menú Principal
            </button>
            <button className="mr__btn mr__btn--primary" onClick={restart}>
              Reintentar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
