// Diagramas exclusivos del tutorial de Carrera.

import React from 'react';
import { Defs, Frame, Label, Ship, VB } from '../../common/svg/HudPrimitives.jsx';

export function DiagRacingType() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// PROPULSIÓN POR INPUT" tone="primary" />
        <line x1="0" y1="105" x2="240" y2="105" stroke="var(--col-primary)" strokeOpacity="0.5" />
        <line x1="0" y1="95"  x2="240" y2="95"  stroke="var(--col-primary)" strokeOpacity="0.15" strokeDasharray="8 12" />
        <line x1="0" y1="115" x2="240" y2="115" stroke="var(--col-primary)" strokeOpacity="0.15" strokeDasharray="8 12" />
        <g className="td-slide-right">
          <path d="M40 105 L20 100 L0 105 L20 110 Z" fill="url(#grad-primary)" />
          <Ship x="80" y="105" scale="1.4" />
        </g>
        <g transform="translate(34 155)">
          <rect width="172" height="22" rx="1" fill="rgba(0,0,0,0.6)" stroke="var(--col-primary)" strokeOpacity="0.4" />
          {'ESCRIBIR'.split('').map((c, i) => (
            <text key={i} x={12 + i * 18} y="16" className="td-text td-text-primary" style={{ opacity: 0.25 + i * 0.09 }}>{c}</text>
          ))}
          <rect x="158" y="6" width="2" height="11" fill="var(--col-primary)" className="td-blink" />
        </g>
      </Frame>
    </svg>
  );
}

export function DiagDistance() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// VECTOR DISTANCIA" tone="primary" />
        <g transform="translate(36 38)">
          <rect width="24" height="148" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" />
          <rect y="60" width="24" height="88" fill="url(#grad-primary)" />
          <rect y="60" width="24" height="4" fill="var(--col-primary)" />
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <line key={p} x1="-4" y1={148 * p} x2="0" y2={148 * p} stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
          ))}
          <line x1="-6" y1="0" x2="30" y2="0" stroke="var(--col-warning)" strokeWidth="1.2" strokeDasharray="2 2" />
        </g>
        <text x="70" y="42"  className="td-text-sm td-text-warning">▸ 500 m  meta</text>
        <text x="70" y="105" className="td-text-sm td-text-primary">▸ 320 m  actual</text>
        <text x="70" y="180" className="td-text-sm td-text-dim">▸   0 m  inicio</text>
        <g transform="translate(70 140)">
          <rect width="150" height="6" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" />
          <rect width="96" height="6" fill="var(--col-primary)" />
          <text x="0" y="-3" className="td-text-sm td-text-dim">progreso</text>
          <text x="150" y="-3" textAnchor="end" className="td-text-sm td-text-primary">64%</text>
        </g>
      </Frame>
    </svg>
  );
}

export function DiagTimer() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame tone="warning">
        <Label text="// CRONÓMETRO" tone="warning" />
        <g transform="translate(120 105)">
          <circle r="58" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
          <circle r="54" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
          <circle r="54" fill="none" stroke="var(--col-warning)" strokeWidth="6"
            strokeDasharray="339" strokeDashoffset="100" transform="rotate(-90)" filter="url(#glow-p)" />
          {[...Array(12)].map((_, i) => (
            <line key={i} transform={`rotate(${i * 30})`} x1="0" y1="-62" x2="0" y2="-58"
              stroke={i % 3 === 0 ? 'var(--col-warning)' : 'rgba(255,255,255,0.3)'} strokeWidth={i % 3 === 0 ? 1.2 : 0.6} />
          ))}
          <text x="0" y="6"  textAnchor="middle" className="td-text-xxl td-text-warning">42</text>
          <text x="0" y="22" textAnchor="middle" className="td-text-sm td-text-dim">SEGUNDOS</text>
        </g>
        <text x="120" y="188" textAnchor="middle" className="td-text-sm td-text-danger">⊘  TIMEOUT = DERROTA</text>
      </Frame>
    </svg>
  );
}

export function DiagPhrase() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// PÁRRAFO ACTIVO" tone="primary" />
        <g transform="translate(18 48)">
          <path d="M0 4 L4 0 L200 0 L204 4 L204 100 L200 104 L4 104 L0 100 Z"
            fill="rgba(0,0,0,0.55)" stroke="var(--col-primary)" strokeOpacity="0.5" />
          <text x="14" y="26" className="td-text-sm td-text-dim">las palabras no se</text>
          <g transform="translate(14 50)">
            <text className="td-text td-text-primary" filter="url(#glow-p)">ACABAN</text>
            <rect x="46" y="-10" width="2" height="14" fill="var(--col-primary)" className="td-blink" />
          </g>
          <text x="14" y="76" className="td-text-sm td-text-dim">solo cambian de mano</text>
          <g transform="translate(14 90)">
            {[...Array(20)].map((_, i) => (
              <rect key={i} x={i * 9} y="0" width="6" height="2"
                fill={i < 8 ? 'var(--col-primary)' : 'rgba(255,255,255,0.15)'} />
            ))}
          </g>
        </g>
      </Frame>
    </svg>
  );
}

export function DiagOpponent() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// RIVAL DETECTADO" tone="warning" />
        <g transform="translate(50 65)">
          <Ship scale="1.3" />
          <text x="0" y="38" textAnchor="middle" className="td-text-sm td-text-primary">TÚ</text>
          <g transform="translate(-22 46)">
            <rect width="44" height="6" fill="rgba(0,0,0,0.5)" stroke="var(--col-primary)" strokeOpacity="0.4" />
            <rect width="34" height="6" fill="var(--col-primary)" />
            <text x="22" y="14" textAnchor="middle" className="td-text-sm td-text-primary">~30 WPM</text>
          </g>
        </g>
        <g transform="translate(190 80)">
          <Ship scale="1.1" color="var(--col-danger)" />
          <text x="0" y="36" textAnchor="middle" className="td-text-sm td-text-danger">RIVAL</text>
          <g transform="translate(-22 44)">
            <rect width="44" height="6" fill="rgba(0,0,0,0.5)" stroke="var(--col-danger)" strokeOpacity="0.4" />
            <rect width="22" height="6" fill="var(--col-danger)" />
            <text x="22" y="14" textAnchor="middle" className="td-text-sm td-text-danger">25 WPM</text>
          </g>
        </g>
        <line x1="80" y1="75" x2="170" y2="90" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 4" />
        <path d="M165 88 L172 90 L165 92" fill="none" stroke="var(--col-danger)" strokeOpacity="0.5" />
      </Frame>
    </svg>
  );
}

export function DiagWpmAccuracy() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// MÉTRICAS EN VIVO" tone="primary" />
        <g transform="translate(24 38)">
          <path d="M0 4 L4 0 L90 0 L94 4 L94 56 L90 60 L4 60 L0 56 Z"
            fill="rgba(0,255,204,0.06)" stroke="var(--col-primary)" strokeOpacity="0.5" />
          <text x="8"  y="14" className="td-text-sm td-text-dim">WPM</text>
          <text x="47" y="42" textAnchor="middle" className="td-text-xl td-text-primary">68</text>
          <text x="86" y="14" textAnchor="end" className="td-text-sm td-text-primary">▲</text>
        </g>
        <g transform="translate(124 38)">
          <path d="M0 4 L4 0 L90 0 L94 4 L94 56 L90 60 L4 60 L0 56 Z"
            fill="rgba(0,255,204,0.06)" stroke="var(--col-primary)" strokeOpacity="0.5" />
          <text x="8"  y="14" className="td-text-sm td-text-dim">ACCURACY</text>
          <text x="47" y="42" textAnchor="middle" className="td-text-xl td-text-primary">94%</text>
          <text x="86" y="14" textAnchor="end" className="td-text-sm td-text-primary">▲</text>
        </g>
        <g transform="translate(24 118)">
          <path d="M0 30 L20 28 L40 24 L60 22 L80 18 L100 20 L120 14 L140 16 L160 8 L180 10 L194 6"
            fill="none" stroke="var(--col-primary)" strokeWidth="1.5" className="td-draw" />
          <line x1="0" y1="40" x2="194" y2="40" stroke="rgba(255,255,255,0.1)" />
        </g>
        <text x="120" y="180" textAnchor="middle" className="td-text-sm td-text-warning">precisión &gt; velocidad</text>
      </Frame>
    </svg>
  );
}
