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

  return (
    <div className="loading-screen" style={S.root}>
      <div style={S.grid} />

      <div style={S.panel}>
        {/* ── Title ── */}
        <div style={S.titleBlock}>
          <span style={S.titleMain}>BABEL</span>
          <span style={S.titleColon}>:</span>
          <span style={S.titleSub}>LEXICON WAR</span>
        </div>

        <div style={S.hairline} />

        {/* ── Mode badge ── */}
        <div style={S.modeBadge}>
          <span style={S.modeBadgeText}>{modeLabel}</span>
        </div>

        <div style={S.hairline} />

        {/* ── Stage message ── */}
        <div style={S.messageRow}>
          <span style={S.messageDiamond}>◊</span>
          <span style={S.messageText}>{message || 'INICIALIZANDO'}</span>
          <span style={{ ...S.messageCursor, opacity: cursorOn ? 1 : 0 }}>█</span>
        </div>

        {/* ── Progress bar ── */}
        <div
          className={pct > 0 && !isDone ? 'loading-bar-active' : ''}
          style={S.barTrack}
        >
          <div style={{ ...S.barFill, width: pct + '%' }}>
            {pct > 2 && pct < 98 && (
              <div className="loading-scan" style={S.barScan} />
            )}
          </div>
        </div>

        {/* ── Percentage ── */}
        <div style={S.pctRow}>
          <span style={S.pctSep}>────────────────────────</span>
          <span style={{ ...S.pctNum,
            color: isDone ? '#00ff88' : '#00ffcc',
            textShadow: isDone ? '0 0 22px #00ff88' : '0 0 14px #00ffcc88' }}>
            {String(pct).padStart(3, '0')}
          </span>
          <span style={S.pctSymbol}>%</span>
          <span style={S.pctSep}>────────────────────────</span>
        </div>

        <div style={S.hairline} />

        {/* ── Quote ── */}
        <div style={S.quoteBlock}>
          <p style={S.quoteLine}>"Las palabras no se acaban.</p>
          <p style={S.quoteLine}>&nbsp;Solo cambian de mano."</p>
          <p style={S.quoteAttr}>— LYRA VOSS · ÚLTIMA TRANSMISIÓN</p>
        </div>
      </div>

      {/* ── Bottom status ── */}
      <div style={S.footer}>
        <span style={S.footerText}>PROGRAMA · TYPO · ACTIVO</span>
        <span style={S.footerSep}>|</span>
        <span style={S.footerText}>PROTOCOLO DE CARGA · EN CURSO</span>
        <span style={S.footerSep}>|</span>
        <span style={S.footerText}>KAEL · VOSS</span>
      </div>
    </div>
  );
}

const S = {
  root: {
    position: 'fixed', inset: 0, zIndex: 50,
    background: '#000',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Orbitron', sans-serif",
  },
  grid: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'radial-gradient(circle, rgba(0,255,204,0.06) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
    zIndex: 0,
  },
  panel: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '1.35rem',
    width: 'clamp(340px, 52vw, 640px)',
    padding: '2.4rem 2.8rem',
    border: '1px solid rgba(0,255,204,0.14)',
    background: 'rgba(0,0,0,0.82)',
  },
  titleBlock: { display: 'flex', alignItems: 'baseline', gap: '0.5rem' },
  titleMain: {
    fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 800,
    letterSpacing: '0.32em', color: '#00ffcc',
    textShadow: '0 0 28px #00ffcc66',
  },
  titleColon: {
    fontSize: 'clamp(1.4rem, 3.5vw, 2.4rem)', fontWeight: 400,
    color: 'rgba(0,255,204,0.4)',
  },
  titleSub: {
    fontSize: 'clamp(0.9rem, 2vw, 1.3rem)', fontWeight: 500,
    letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)',
  },
  hairline: {
    width: '100%', height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(0,255,204,0.25), transparent)',
  },
  modeBadge: {
    padding: '0.3rem 1.2rem',
    border: '1px solid rgba(0,255,204,0.22)',
    background: 'rgba(0,255,204,0.04)',
  },
  modeBadgeText: {
    fontSize: 'clamp(0.7rem, 1.4vw, 0.9rem)',
    letterSpacing: '0.35em', color: '#00ffcc', fontWeight: 700,
  },
  messageRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', minHeight: '1.4rem' },
  messageDiamond: { fontSize: '0.75rem', color: 'rgba(0,255,204,0.55)' },
  messageText: {
    fontSize: 'clamp(0.6rem, 1.1vw, 0.74rem)',
    letterSpacing: '0.24em', color: 'rgba(255,255,255,0.45)',
  },
  messageCursor: { fontSize: '0.65rem', color: 'rgba(0,255,204,0.7)', transition: 'opacity 0.1s' },
  barTrack: {
    width: '100%', height: '6px',
    background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden',
    border: '1px solid rgba(0,255,204,0.08)',
  },
  barFill: {
    position: 'relative', height: '100%',
    background: 'linear-gradient(90deg, #006655, #00ffcc)',
    borderRadius: '2px', transition: 'width 0.22s ease', overflow: 'hidden',
  },
  barScan: {
    position: 'absolute', top: 0, left: 0, width: '28%', height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
  },
  pctRow: { display: 'flex', alignItems: 'baseline', gap: '0.7rem' },
  pctSep: { fontSize: '0.55rem', color: 'rgba(0,255,204,0.18)', letterSpacing: '0.05em' },
  pctNum: {
    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800,
    letterSpacing: '-0.02em', lineHeight: 1, transition: 'color 0.5s, text-shadow 0.5s',
    fontVariantNumeric: 'tabular-nums',
  },
  pctSymbol: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' },
  quoteBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', padding: '0.6rem 0 0.2rem' },
  quoteLine: {
    fontSize: 'clamp(0.65rem, 1.2vw, 0.8rem)',
    letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic', lineHeight: 1.6,
  },
  quoteAttr: {
    marginTop: '0.4rem',
    fontSize: 'clamp(0.52rem, 0.9vw, 0.64rem)',
    letterSpacing: '0.25em', color: 'rgba(0,255,204,0.3)',
  },
  footer: {
    position: 'absolute', bottom: '1.4rem', left: 0, right: 0,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '1rem', zIndex: 1,
  },
  footerText: { fontSize: '0.56rem', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.18)' },
  footerSep:  { fontSize: '0.56rem', color: 'rgba(255,255,255,0.1)' },
};
