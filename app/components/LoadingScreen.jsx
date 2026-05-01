import React, { useEffect, useState } from 'react';
import { GAME_MODES } from '../../shared/constants.js';

const MODE_LABELS = {
  [GAME_MODES.COMBAT]: 'MODO · COMBATE',
  [GAME_MODES.RACING]: 'MODO · CARRERA',
};

export default function LoadingScreen({ progress = 0, mode = null, message = '' }) {
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 480);
    return () => clearInterval(id);
  }, []);

  const pct       = Math.round(Math.max(0, Math.min(100, progress)));
  const modeLabel = mode ? (MODE_LABELS[mode] ?? mode.toUpperCase()) : 'BABEL · LEXICON WAR';
  const isDone    = pct >= 100;

  const pctNumStyle = {
    color: isDone ? '#00ff88' : '#00ffcc',
    textShadow: isDone ? '0 0 22px #00ff88' : '0 0 14px #00ffcc88',
  };

  return (
    <div className="loading-root">
      <div className="loading-grid" />

      <div className="loading-panel">
        {/* ── Title ── */}
        <div className="loading-title">
          <span className="loading-title__main">BABEL</span>
          <span className="loading-title__colon">:</span>
          <span className="loading-title__sub">LEXICON WAR</span>
        </div>

        <div className="loading-hairline" />

        {/* ── Mode badge ── */}
        <div className="loading-mode-badge">
          <span className="loading-mode-badge__text">{modeLabel}</span>
        </div>

        <div className="loading-hairline" />

        {/* ── Stage message ── */}
        <div className="loading-message-row">
          <span className="loading-message__diamond">◊</span>
          <span className="loading-message__text">{message || 'INICIALIZANDO'}</span>
          <span className="loading-message__cursor" style={{ opacity: cursorOn ? 1 : 0 }}>█</span>
        </div>

        {/* ── Progress bar ── */}
        <div className={`loading-bar-track${pct > 0 && !isDone ? ' loading-bar-active' : ''}`}>
          <div className="loading-bar-fill" style={{ width: pct + '%' }}>
            {pct > 2 && pct < 98 && (
              <div className="loading-bar-scan" />
            )}
          </div>
        </div>

        {/* ── Percentage ── */}
        <div className="loading-pct-row">
          <span className="loading-pct__sep">────────────────────────</span>
          <span className="loading-pct__num" style={pctNumStyle}>
            {String(pct).padStart(3, '0')}
          </span>
          <span className="loading-pct__symbol">%</span>
          <span className="loading-pct__sep">────────────────────────</span>
        </div>

        <div className="loading-hairline" />

        {/* ── Quote ── */}
        <div className="loading-quote">
          <p className="loading-quote__line">"Error de sintaxis.</p>
          <p className="loading-quote__line">&nbsp;Coincidencia fallida."</p>
          <p className="loading-quote__attr">— SISTEMA BABEL · ALERTA DE CARGA</p>
        </div>
      </div>

      {/* ── Bottom status ── */}
      <div className="loading-footer">
        <span className="loading-footer__text">PROGRAMA · TYPO · ACTIVO</span>
        <span className="loading-footer__sep">|</span>
        <span className="loading-footer__text">PROTOCOLO DE CARGA · EN CURSO</span>
        <span className="loading-footer__sep">|</span>
        <span className="loading-footer__text">KAEL · VOSS</span>
      </div>
    </div>
  );
}
