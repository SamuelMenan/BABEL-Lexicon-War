// Diagramas exclusivos del tutorial de Mecanografia Tactil.

import React from 'react';
import { Defs, Frame, Label, VB } from '../../common/svg/HudPrimitives.jsx';

export function DiagPosture() {
  const STK = 'var(--col-primary)';
  const FILL = 'rgba(0,255,204,0.08)';
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// ESTACION DE TRABAJO" tone="primary" />
        <g transform="translate(60 36)">
          <rect width="120" height="78" rx="3" fill="rgba(0,0,0,0.6)" stroke={STK} strokeWidth="1.6" />
          <rect x="6" y="6" width="108" height="66" fill={FILL} stroke={STK} strokeOpacity="0.4" />
          <g transform="translate(12 18)">
            <rect width="50" height="4" fill={STK} fillOpacity="0.6" />
            <rect y="10" width="76" height="4" fill={STK} fillOpacity="0.4" />
            <rect y="20" width="60" height="4" fill={STK} fillOpacity="0.4" />
            <rect y="30" width="84" height="4" fill={STK} fillOpacity="0.6" />
            <rect x="86" y="2" width="2" height="6" fill={STK} className="td-blink" />
          </g>
          <circle cx="60" cy="76" r="1.4" fill={STK} className="td-pulse" />
        </g>
        <path d="M114 114 L126 124 L150 124" fill="none" stroke={STK} strokeWidth="1.6" />
        <ellipse cx="120" cy="128" rx="22" ry="3" fill={FILL} stroke={STK} strokeOpacity="0.6" strokeWidth="1.2" />
        <line x1="20" y1="138" x2="220" y2="138" stroke={STK} strokeOpacity="0.6" strokeWidth="1.4" />
        <g transform="translate(70 144)">
          <path d="M0 4 L4 0 L96 0 L100 4 L100 22 L96 26 L4 26 L0 22 Z"
            fill="rgba(0,0,0,0.55)" stroke={STK} strokeWidth="1.2" />
          {[...Array(11)].map((_, i) => (
            <rect key={`r1-${i}`} x={6 + i * 8.4} y="5" width="6.5" height="5" rx="0.6" fill="rgba(255,255,255,0.08)" />
          ))}
          {[...Array(11)].map((_, i) => (
            <rect key={`r2-${i}`} x={6 + i * 8.4} y="12" width="6.5" height="5" rx="0.6" fill="rgba(0,255,204,0.15)" />
          ))}
          <rect x="22" y="19" width="56" height="5" rx="0.6" fill="rgba(255,255,255,0.08)" />
        </g>
        <g transform="translate(186 154)">
          <ellipse cx="0" cy="0" rx="9" ry="11" fill={FILL} stroke={STK} strokeWidth="1.2" />
          <line x1="0" y1="-8" x2="0" y2="-2" stroke={STK} strokeOpacity="0.6" />
        </g>
        <text x="120" y="190" textAnchor="middle" className="td-text-sm td-text-primary">pantalla a la altura de los ojos</text>
      </Frame>
    </svg>
  );
}

export function DiagNoLook() {
  const BRAIN_FILL = '#ff8aa3';
  const BRAIN_STK  = '#d94668';
  const BAR        = '#1a1a1a';
  const PLATE      = '#0d0d0d';
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// ENTRENA LA MEMORIA" tone="primary" />
        <g>
          <rect x="42" y="44" width="156" height="4" fill={BAR} />
          <ellipse cx="44" cy="46" rx="6" ry="18" fill={PLATE} stroke="#000" strokeWidth="1" />
          <ellipse cx="50" cy="46" rx="3" ry="12" fill="#fff" opacity="0.15" />
          <ellipse cx="196" cy="46" rx="6" ry="18" fill={PLATE} stroke="#000" strokeWidth="1" />
          <ellipse cx="190" cy="46" rx="3" ry="12" fill="#fff" opacity="0.15" />
        </g>
        <g stroke={BRAIN_STK} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M88 90 Q82 72 80 50" />
          <path d="M152 90 Q158 72 160 50" />
        </g>
        <g transform="translate(120 108)">
          <path
            d="M -38 -8 C -42 -22, -28 -32, -14 -28 C -18 -38, -2 -42, 8 -32 C 18 -40, 34 -30, 32 -16 C 42 -10, 42 10, 30 16 C 32 28, 16 34, 4 28 C 0 36, -14 36, -20 28 C -34 28, -42 16, -38 -8 Z"
            fill={BRAIN_FILL} stroke={BRAIN_STK} strokeWidth="1.8"
          />
          <g fill="none" stroke={BRAIN_STK} strokeWidth="1" strokeLinecap="round">
            <path d="M-22 -16 Q-12 -8 -20 0" />
            <path d="M-6 -22 Q4 -14 -2 -4" />
            <path d="M12 -20 Q22 -14 16 0" />
            <path d="M-26 4 Q-14 10 -20 18" />
            <path d="M0 8 Q10 12 4 22" />
            <path d="M16 6 Q26 12 20 22" />
          </g>
          <g stroke="#222" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M-14 -4 Q-8 -8 -2 -4" />
            <path d="M2 -4 Q8 -8 14 -4" />
          </g>
          <path d="M-8 8 Q0 14 8 8 L8 12 L-8 12 Z" fill="#fff" stroke="#222" strokeWidth="1.2" />
          <line x1="-8" y1="10" x2="8" y2="10" stroke="#222" strokeWidth="0.6" />
          <g transform="translate(-32 -16)">
            <path d="M0 0 Q-3 4 0 6 Q3 4 0 0 Z" fill="#9ed6ff" stroke="#5aa6d8" strokeWidth="0.6" />
          </g>
          <g transform="translate(28 -10)">
            <path d="M0 0 Q-2.5 3 0 5 Q2.5 3 0 0 Z" fill="#9ed6ff" stroke="#5aa6d8" strokeWidth="0.6" />
          </g>
        </g>
        <g stroke={BRAIN_STK} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M108 132 L106 162" />
          <path d="M132 132 L134 162" />
        </g>
        <ellipse cx="104" cy="166" rx="6" ry="3" fill="#222" />
        <ellipse cx="138" cy="166" rx="6" ry="3" fill="#222" />
        <ellipse cx="120" cy="180" rx="32" ry="3" fill="rgba(0,0,0,0.3)" />
        <text x="120" y="194" textAnchor="middle" className="td-text-sm td-text-primary">no mires · ejercita la memoria</text>
      </Frame>
    </svg>
  );
}

export function DiagAccuracy() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// CURVA APRENDIZAJE" tone="primary" />
        <line x1="32" y1="170" x2="220" y2="170" stroke="rgba(255,255,255,0.2)" />
        <line x1="32" y1="40"  x2="32"  y2="170" stroke="rgba(255,255,255,0.2)" />
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1="32" y1={170 - i * 32} x2="220" y2={170 - i * 32} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
        ))}
        <path d="M32 160 Q60 130 100 95 T220 60"
          fill="none" stroke="var(--col-primary)" strokeWidth="2.4" filter="url(#glow-p)" className="td-draw" />
        <path d="M32 168 Q60 160 100 135 T220 80"
          fill="none" stroke="var(--col-warning)" strokeWidth="2" strokeDasharray="3 3" className="td-draw td-delay" />
        <g transform="translate(150 46)">
          <line x1="0" y1="0" x2="14" y2="0" stroke="var(--col-primary)" strokeWidth="2.4" />
          <text x="18" y="3" className="td-text-sm td-text-primary">ACCURACY</text>
        </g>
        <g transform="translate(150 60)">
          <line x1="0" y1="0" x2="14" y2="0" stroke="var(--col-warning)" strokeWidth="2" strokeDasharray="3 3" />
          <text x="18" y="3" className="td-text-sm td-text-warning">WPM</text>
        </g>
        <text x="34"  y="32"  className="td-text-sm td-text-dim">↑ valor</text>
        <text x="218" y="186" textAnchor="end" className="td-text-sm td-text-dim">tiempo →</text>
      </Frame>
    </svg>
  );
}

export function DiagPractice() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// MINI PRACTICA" tone="primary" />
        <g transform="translate(20 38)">
          <rect width="200" height="22" rx="2" fill="rgba(0,0,0,0.5)" stroke="var(--col-primary)" strokeOpacity="0.5" />
          <text x="100" y="15" textAnchor="middle" className="td-text td-text-primary">asdf jkl;</text>
        </g>
        <g transform="translate(20 68)">
          <text x="0" y="8" className="td-text-sm td-text-dim">→ tipea:</text>
          <text x="44" y="8" className="td-text-sm td-text-primary">asdf</text>
          <rect x="75" y="0" width="2" height="10" fill="var(--col-primary)" className="td-blink" />
        </g>
        <g transform="translate(20 88)">
          <path d="M0 4 L4 0 L196 0 L200 4 L200 88 L196 92 L4 92 L0 88 Z"
            fill="rgba(0,0,0,0.5)" stroke="var(--col-primary)" strokeWidth="1.2" />
          {'QWERTYUIOP'.split('').map((c, i) => (
            <g key={`r1-${c}`}>
              <rect x={6 + i * 18.6} y="6" width="14" height="14" rx="1.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <text x={13 + i * 18.6} y="16" textAnchor="middle" className="td-text-sm td-text-dim">{c}</text>
            </g>
          ))}
          {'ASDFGHJKL;'.split('').map((c, i) => {
            const isHome = i <= 3 || (i >= 5 && i <= 9);
            const colored = 'ASDFJKL;'.includes(c);
            return (
              <g key={`r2-${c}`}>
                <rect x={14 + i * 18.6} y="24" width="14" height="14" rx="1.5"
                  fill={colored ? 'rgba(0,255,204,0.22)' : isHome ? 'rgba(0,255,204,0.08)' : 'rgba(255,255,255,0.06)'}
                  stroke={colored ? 'var(--col-primary)' : 'rgba(255,255,255,0.15)'}
                  strokeWidth={colored ? 0.9 : 0.5}
                  filter={colored ? 'url(#glow-p)' : undefined} />
                <text x={21 + i * 18.6} y="34" textAnchor="middle" className={colored ? 'td-text-sm td-text-primary' : 'td-text-sm td-text-dim'}>{c}</text>
                {(c === 'F' || c === 'J') && <line x1={18 + i * 18.6} y1="37" x2={24 + i * 18.6} y2="37" stroke="var(--col-warning)" strokeWidth="1" />}
              </g>
            );
          })}
          {'ZXCVBNM,.'.split('').map((c, i) => (
            <g key={`r3-${c}`}>
              <rect x={22 + i * 18.6} y="42" width="14" height="14" rx="1.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <text x={29 + i * 18.6} y="52" textAnchor="middle" className="td-text-sm td-text-dim">{c}</text>
            </g>
          ))}
          <rect x="40" y="60" width="120" height="14" rx="1.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <text x="100" y="70" textAnchor="middle" className="td-text-sm td-text-dim">␣</text>
        </g>
        <text x="120" y="194" textAnchor="middle" className="td-text-sm td-text-warning">repite 3 veces · sin mirar</text>
      </Frame>
    </svg>
  );
}
