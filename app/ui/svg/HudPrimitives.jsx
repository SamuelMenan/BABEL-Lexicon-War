// Primitivas SVG reutilizables: Defs (gradients/filters/pattern),
// Frame chamfered, Label, Ship, Enemy, HudBar. Compartidas por todos
// los diagramas del tutorial y disponibles para otras pantallas HUD.

import React from 'react';

export const VB = '0 0 240 200';

/* ── Defs compartidos ────────────────────────────────────────── */
export function Defs() {
  return (
    <defs>
      <linearGradient id="grad-primary" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0"  stopColor="var(--col-primary)" stopOpacity="0.35" />
        <stop offset="1"  stopColor="var(--col-primary)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="grad-danger" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0"  stopColor="var(--col-danger)" stopOpacity="0.45" />
        <stop offset="1"  stopColor="var(--col-danger)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="grad-warning" x1="0" x2="1">
        <stop offset="0"   stopColor="var(--col-warning)" stopOpacity="0.1" />
        <stop offset="0.6" stopColor="var(--col-warning)" stopOpacity="0.9" />
        <stop offset="1"   stopColor="var(--col-danger)"  stopOpacity="1" />
      </linearGradient>
      <linearGradient id="grad-flow" x1="0" x2="1">
        <stop offset="0"   stopColor="var(--col-primary)" />
        <stop offset="0.5" stopColor="var(--col-flow)" />
        <stop offset="1"   stopColor="var(--col-danger)" />
      </linearGradient>
      <radialGradient id="grad-radial">
        <stop offset="0" stopColor="var(--col-primary)" stopOpacity="0.5" />
        <stop offset="1" stopColor="var(--col-primary)" stopOpacity="0" />
      </radialGradient>
      <filter id="glow-p" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-d" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <pattern id="scan-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0 L0 0 0 20" fill="none" stroke="var(--col-primary)" strokeOpacity="0.07" strokeWidth="0.5" />
      </pattern>
    </defs>
  );
}

/* ── Frame chamfered ─────────────────────────────────────────── */
const FRAME_STROKES = {
  primary: 'var(--col-primary)',
  danger:  'var(--col-danger)',
  warning: 'var(--col-warning)',
};

export function Frame({ children, tone = 'primary' }) {
  const stroke = FRAME_STROKES[tone] || FRAME_STROKES.primary;
  return (
    <g>
      <rect x="0" y="0" width="240" height="200" fill="url(#scan-grid)" />
      <path
        d="M8 2 L232 2 L238 8 L238 192 L232 198 L8 198 L2 192 L2 8 Z"
        fill="rgba(0,0,0,0.35)"
        stroke={stroke}
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      <path d="M6 14 L6 6 L14 6"       fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth="1" />
      <path d="M234 14 L234 6 L226 6"  fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth="1" />
      <path d="M6 186 L6 194 L14 194"  fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth="1" />
      <path d="M234 186 L234 194 L226 194" fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth="1" />
      {children}
    </g>
  );
}

/* ── Label superior ──────────────────────────────────────────── */
const LABEL_TONES = {
  primary: 'td-text-sm td-text-primary',
  warning: 'td-text-sm td-text-warning',
  danger:  'td-text-sm td-text-danger',
  dim:     'td-text-sm td-text-dim',
};
export function Label({ x = 120, y = 18, text, tone = 'dim' }) {
  return <text x={x} y={y} textAnchor="middle" className={LABEL_TONES[tone] || LABEL_TONES.dim}>{text}</text>;
}

/* ── Nave ────────────────────────────────────────────────────── */
export function Ship({ x = 0, y = 0, color = 'var(--col-primary)', scale = 1, opacity = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <path d="M0 -16 L14 8 L8 14 L0 10 L-8 14 L-14 8 Z"
        fill="rgba(0,0,0,0.5)" stroke={color} strokeWidth="1.4" strokeLinejoin="round" filter="url(#glow-p)" />
      <path d="M0 -12 L0 8" stroke={color} strokeOpacity="0.45" strokeWidth="0.8" />
      <circle cx="0" cy="-2" r="2.4" fill={color} />
      <path d="M-10 6 L-14 12 M10 6 L14 12" stroke={color} strokeOpacity="0.5" strokeWidth="0.8" />
      <path d="M-4 14 L4 14" stroke={color} strokeOpacity="0.6" strokeWidth="1.4" />
      <circle cx="-4" cy="16" r="1.5" fill={color} opacity="0.8" className="td-pulse-fast" />
      <circle cx="4"  cy="16" r="1.5" fill={color} opacity="0.8" className="td-pulse-fast" />
    </g>
  );
}

/* ── Enemigo (hex con palabra) ───────────────────────────────── */
export function Enemy({ x = 0, y = 0, scale = 1, word = '' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <polygon points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8"
        fill="rgba(255,68,102,0.18)" stroke="var(--col-danger)" strokeWidth="1.5" filter="url(#glow-d)" />
      <polygon points="0,-9 8,-4 8,5 0,9 -8,5 -8,-4" fill="none" stroke="var(--col-danger)" strokeOpacity="0.5" strokeWidth="0.6" />
      <circle cx="0" cy="0" r="2.2" fill="var(--col-danger)" />
      {word && (
        <g transform="translate(0 -22)">
          <rect x="-22" y="-9" width="44" height="14" rx="1.5" fill="rgba(0,0,0,0.7)" stroke="var(--col-danger)" strokeOpacity="0.7" />
          <text x="0" y="1" textAnchor="middle" className="td-text-sm td-text-danger">{word}</text>
        </g>
      )}
    </g>
  );
}

/* ── Barra HUD con notches + threshold ───────────────────────── */
export function HudBar({ x, y, w = 150, label, value, max = 100, color = 'var(--col-primary)', threshold = null }) {
  const pct = Math.min(1, value / max);
  return (
    <g transform={`translate(${x} ${y})`}>
      <text x="0" y="-3" className="td-text-sm td-text-dim">{label}</text>
      <text x={w} y="-3" textAnchor="end" className="td-text-sm" fill={color}>{value}/{max}</text>
      <rect x="0" y="0" width={w} height="10" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      <rect x="0" y="0" width={w * pct} height="10" fill={color} fillOpacity="0.85" />
      <rect x="0" y="0" width={w * pct} height="3" fill={color} />
      {[0.25, 0.5, 0.75].map(n => (
        <line key={n} x1={w * n} y1="0" x2={w * n} y2="10" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
      ))}
      {threshold !== null && (
        <line x1={w * (threshold / max)} y1="-2" x2={w * (threshold / max)} y2="12"
          stroke="var(--col-danger)" strokeWidth="0.8" strokeDasharray="2 2" />
      )}
    </g>
  );
}
