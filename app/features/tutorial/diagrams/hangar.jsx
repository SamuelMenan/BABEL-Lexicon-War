// Diagramas exclusivos del tutorial de Hangar.

import React from 'react';
import { Defs, Frame, Label, Ship, VB } from '../../common/svg/HudPrimitives.jsx';

export function DiagHangarOverview() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// LAYOUT HANGAR" tone="primary" />
        <g transform="translate(74 32)">
          <path d="M0 4 L4 0 L88 0 L92 4 L92 100 L88 104 L4 104 L0 100 Z"
            fill="rgba(0,255,204,0.05)" stroke="var(--col-primary)" />
          <text x="46" y="14" textAnchor="middle" className="td-text-sm td-text-dim">PREVIEW 3D</text>
          <line x1="8" y1="18" x2="84" y2="18" stroke="var(--col-primary)" strokeOpacity="0.25" />
          <Ship x="46" y="62" scale="2.2" />
        </g>
        <g transform="translate(14 50)">
          <rect width="50" height="32" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" />
          {[0, 1, 2].map(i => <rect key={i} x={4 + i * 15} y="4" width="10" height="10" fill="rgba(0,255,204,0.15)" stroke="var(--col-primary)" strokeOpacity="0.4" />)}
          <text x="25" y="26" textAnchor="middle" className="td-text-sm td-text-dim">FLOTA</text>
        </g>
        <g transform="translate(176 50)">
          <rect width="50" height="62" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" />
          {[0, 1, 2, 3].map(i => (
            <g key={i} transform={`translate(4 ${6 + i * 13})`}>
              <text x="0" y="6" className="td-text-sm td-text-dim">●</text>
              <rect x="10" y="2" width="32" height="3" fill="rgba(255,255,255,0.1)" />
              <rect x="10" y="2" width={6 + i * 7} height="3" fill="var(--col-primary)" />
            </g>
          ))}
        </g>
        <g transform="translate(74 142)">
          <path d="M0 2 L2 0 L88 0 L92 4 L92 28 L88 32 L4 32 L0 28 Z"
            fill="rgba(0,255,204,0.12)" stroke="var(--col-primary)" />
          <text x="46" y="20" textAnchor="middle" className="td-text-sm td-text-primary">▸ DESPLEGAR</text>
        </g>
      </Frame>
    </svg>
  );
}

export function DiagHangarSlots() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// SELECCION · PILOTO" tone="primary" />

        {/* Tarjeta Kael — activa */}
        <g transform="translate(20 34)" className="td-pulse">
          <rect width="96" height="140" rx="2"
            fill="rgba(255,204,68,0.08)" stroke="#ffcc44" strokeOpacity="0.85" />
          <rect x="8" y="8" width="80" height="74" rx="1"
            fill="rgba(255,204,68,0.10)" stroke="rgba(255,204,68,0.45)" />
          <circle cx="48" cy="46" r="18" fill="rgba(255,204,68,0.18)" stroke="#ffcc44" />
          <path d="M41 44 Q48 53 55 44" fill="none" stroke="#ffcc44" strokeWidth="1.4" />
          <circle cx="43" cy="40" r="1.5" fill="#ffcc44" />
          <circle cx="53" cy="40" r="1.5" fill="#ffcc44" />
          <rect x="28" y="10" width="60" height="10" fill="#ffcc44" />
          <text
            x="58"
            y="17"
            textAnchor="middle"
            className="td-text-sm"
            fill="#000"
            textLength="60"
            lengthAdjust="spacingAndGlyphs"
          >
            ACTIVO
          </text>
          <text x="48" y="102" textAnchor="middle" className="td-text td-text-primary" fill="#ffcc44">KAEL</text>
          <text
            x="48"
            y="116"
            textAnchor="middle"
            className="td-text-sm td-text-dim"
            textLength="80"
            lengthAdjust="spacingAndGlyphs"
          >
            K-07 · VANGUARD
          </text>
          <text
            x="48"
            y="130"
            textAnchor="middle"
            className="td-text-sm td-text-dim"
            textLength="80"
            lengthAdjust="spacingAndGlyphs"
          >
            piloto guardado
          </text>
        </g>

        {/* Tarjeta Voss — alterna */}
        <g transform="translate(124 34)">
          <rect width="96" height="140" rx="2"
            fill="rgba(0,255,204,0.04)" stroke="rgba(0,255,204,0.35)" />
          <rect x="8" y="8" width="80" height="74" rx="1"
            fill="rgba(120,140,160,0.08)" stroke="rgba(120,140,160,0.35)" />
          <circle cx="48" cy="46" r="18" fill="rgba(120,140,160,0.15)" stroke="rgba(160,180,200,0.7)" />
          <path d="M41 50 Q48 41 55 50" fill="none" stroke="rgba(200,200,210,0.85)" strokeWidth="1.4" />
          <circle cx="43" cy="40" r="1.5" fill="rgba(200,200,210,0.85)" />
          <circle cx="53" cy="40" r="1.5" fill="rgba(200,200,210,0.85)" />
          <text x="48" y="102" textAnchor="middle" className="td-text td-text-primary">VOSS</text>
          <text
            x="48"
            y="116"
            textAnchor="middle"
            className="td-text-sm td-text-dim"
            textLength="80"
            lengthAdjust="spacingAndGlyphs"
          >
            V-12 · STRIDER
          </text>
          <text
            x="48"
            y="130"
            textAnchor="middle"
            className="td-text-sm td-text-dim"
            textLength="80"
            lengthAdjust="spacingAndGlyphs"
          >
            click para elegir
          </text>
        </g>
      </Frame>
    </svg>
  );
}

export function DiagHangarNav() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// CONTROL DE NAVE" tone="primary" />
        <g transform="translate(16 68)">
          <path d="M0 4 L4 0 L36 0 L40 4 L40 36 L36 40 L4 40 L0 36 Z"
            fill="rgba(0,255,204,0.08)" stroke="var(--col-primary)" />
          <text x="20" y="26" textAnchor="middle" className="td-text td-text-primary">←</text>
        </g>
        <g transform="translate(74 50)" className="td-pulse-slow">
          <path d="M0 6 L6 0 L86 0 L92 6 L92 70 L86 76 L6 76 L0 70 Z"
            fill="rgba(0,255,204,0.06)" stroke="var(--col-primary)" strokeWidth="1.5" />
          <Ship x="46" y="44" scale="2" />
          <g transform="translate(46 64)">
            {[0,1,2,3,4].map(i => (
              <circle key={i} cx={(i - 2) * 6} cy="0" r="1.6" fill={i === 1 ? 'var(--col-primary)' : 'rgba(255,255,255,0.2)'} />
            ))}
          </g>
        </g>
        <g transform="translate(184 68)">
          <path d="M0 4 L4 0 L36 0 L40 4 L40 36 L36 40 L4 40 L0 36 Z"
            fill="rgba(0,255,204,0.08)" stroke="var(--col-primary)" />
          <text x="20" y="26" textAnchor="middle" className="td-text td-text-primary">→</text>
        </g>
        <g transform="translate(50 148)" className="td-pulse">
          <path d="M0 4 L4 0 L136 0 L140 4 L140 28 L136 32 L4 32 L0 28 Z"
            fill="rgba(0,255,204,0.15)" stroke="var(--col-primary)" strokeWidth="1.5" filter="url(#glow-p)" />
          <text x="70" y="20" textAnchor="middle" className="td-text-sm td-text-primary">ENTER · DESPLEGAR</text>
        </g>
      </Frame>
    </svg>
  );
}
