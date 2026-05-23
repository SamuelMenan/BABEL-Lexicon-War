// Diagramas compartidos entre múltiples tutoriales.
// DiagBranch — selección de rama (combat / racing).
// DiagFlow   — multiplicador Flow (combat & racing).
// DiagCountdown — preparación inicio (combat & racing).

import React from 'react';
import { Defs, Frame, Label, VB } from '../../common/svg/HudPrimitives.jsx';

export function DiagBranch() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// SELECCIONAR RUTA" tone="primary" />
        <g transform="translate(28 50)">
          <path d="M0 4 L4 0 L74 0 L80 6 L80 96 L74 102 L4 102 L0 96 Z"
            fill="url(#grad-primary)" stroke="var(--col-primary)" strokeWidth="1.2" />
          <g transform="translate(40 36)">
            <rect x="-18" y="-12" width="36" height="22" rx="2" fill="rgba(0,255,204,0.1)" stroke="var(--col-primary)" />
            {[...Array(7)].map((_, i) => (
              <rect key={i} x={-15 + i * 5} y="-9" width="3.5" height="3.5" fill="var(--col-primary)" fillOpacity={0.4 + (i % 2) * 0.4} />
            ))}
            {[...Array(7)].map((_, i) => (
              <rect key={i} x={-15 + i * 5} y="-3" width="3.5" height="3.5" fill="var(--col-primary)" fillOpacity={0.4 + (i % 2) * 0.4} />
            ))}
            <rect x="-12" y="3" width="24" height="3.5" fill="var(--col-primary)" fillOpacity="0.7" />
          </g>
          <text x="40" y="74" textAnchor="middle" className="td-text-sm td-text-primary">APRENDER</text>
          <text x="40" y="86" textAnchor="middle" className="td-text-sm td-text-dim">~2 min</text>
        </g>
        <g transform="translate(132 50)">
          <path d="M0 4 L4 0 L74 0 L80 6 L80 96 L74 102 L4 102 L0 96 Z"
            fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <path d="M25 50 L36 60 L55 38" fill="none" stroke="var(--text-dim)" strokeWidth="2" />
          <text x="40" y="80" textAnchor="middle" className="td-text-sm td-text-dim">YA SÉ</text>
          <text x="40" y="92" textAnchor="middle" className="td-text-sm td-text-dim">continuar</text>
        </g>
        <text x="120" y="175" textAnchor="middle" className="td-text-sm td-text-dim">[ ELIGE UNA OPCIÓN ]</text>
      </Frame>
    </svg>
  );
}

export function DiagFlow() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// MULTIPLICADOR FLOW" tone="primary" />
        <line x1="32" y1="170" x2="220" y2="170" stroke="rgba(255,255,255,0.2)" />
        <line x1="32" y1="40"  x2="32"  y2="170" stroke="rgba(255,255,255,0.2)" />
        <line x1="32" y1="160" x2="220" y2="160" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 3" />
        <path d="M32 165 Q 80 162 110 140 T 200 60"
          fill="none" stroke="url(#grad-flow)" strokeWidth="2.5" className="td-draw" />
        <path d="M32 165 Q 80 162 110 140 T 200 60 L200 170 L32 170 Z"
          fill="url(#grad-primary)" opacity="0.25" />
        <text x="28" y="44"  textAnchor="end" className="td-text-sm td-text-flow">x2.0</text>
        <text x="28" y="104" textAnchor="end" className="td-text-sm td-text-dim">x1.5</text>
        <text x="28" y="164" textAnchor="end" className="td-text-sm td-text-dim">x1.0</text>
        <g transform="translate(200 60)" className="td-pulse">
          <circle r="6" fill="var(--col-flow)" fillOpacity="0.25" />
          <circle r="3" fill="var(--col-flow)" />
        </g>
        <text x="120" y="190" textAnchor="middle" className="td-text-sm td-text-dim">racha sin errores ↗</text>
      </Frame>
    </svg>
  );
}

export function DiagCountdown() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame tone="warning">
        <Label text="// INICIO INMINENTE" tone="warning" />
        <g transform="translate(120 100)">
          <circle r="68" fill="none" stroke="var(--col-warning)" strokeOpacity="0.15" strokeWidth="0.6" />
          <circle r="56" fill="none" stroke="var(--col-warning)" strokeOpacity="0.3" strokeWidth="0.8" strokeDasharray="4 3" className="td-pulse-slow" />
          <circle r="46" fill="rgba(0,0,0,0.5)" stroke="var(--col-warning)" strokeWidth="1.6" filter="url(#glow-p)" className="td-pulse" />
          <text x="0" y="16" textAnchor="middle" className="td-text-xxl td-text-warning">3</text>
          {[0, 90, 180, 270].map(a => (
            <line key={a} transform={`rotate(${a})`} x1="46" y1="0" x2="56" y2="0" stroke="var(--col-warning)" strokeWidth="1.4" />
          ))}
        </g>
        <text x="120" y="184" textAnchor="middle" className="td-text-sm td-text-dim">PREPARADO · 3 · 2 · 1</text>
      </Frame>
    </svg>
  );
}
