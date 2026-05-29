// Diagramas exclusivos del tutorial de Combate.

import React from 'react';
import { Defs, Frame, Label, Ship, Enemy, HudBar, VB } from '../../common/svg/HudPrimitives.jsx';

export function DiagCombatIntro() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame tone="danger">
        <Label text="// CONTACTO ENEMIGO" tone="danger" />
        <g className="td-pulse-slow">
          <Enemy x="80"  y="55" scale="0.8" word="ERROR" />
          <Enemy x="140" y="40" scale="0.7" />
          <Enemy x="180" y="65" scale="0.65" />
          <Enemy x="55"  y="85" scale="0.55" />
          <Enemy x="195" y="95" scale="0.5" />
        </g>
        <path d="M120 75 Q120 110 120 145" stroke="var(--col-primary)" strokeWidth="0.8" strokeDasharray="2 4" fill="none" />
        <path d="M120 145 L116 140 M120 145 L124 140" stroke="var(--col-primary)" strokeWidth="0.8" />
        <Ship x="120" y="160" scale="1.5" />
        <g transform="translate(14 178)">
          <rect width="50" height="6" fill="rgba(0,0,0,0.6)" stroke="var(--col-primary)" strokeOpacity="0.4" />
          <rect width="42" height="6" fill="var(--col-primary)" />
        </g>
      </Frame>
    </svg>
  );
}

export function DiagObjective() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame tone="danger">
        <Label text="// PROTOCOLO DE COLAPSO" tone="warning" />
        <g transform="translate(120 90)" className="td-pulse">
          <circle r="42" fill="none" stroke="var(--col-warning)" strokeWidth="0.6" strokeDasharray="3 4" />
          <circle r="32" fill="none" stroke="var(--col-warning)" strokeOpacity="0.5" strokeWidth="0.4" />
          <line x1="-46" y1="0" x2="-34" y2="0" stroke="var(--col-warning)" />
          <line x1="46"  y1="0" x2="34"  y2="0" stroke="var(--col-warning)" />
          <line x1="0" y1="-46" x2="0" y2="-34" stroke="var(--col-warning)" />
          <line x1="0" y1="46"  x2="0" y2="34"  stroke="var(--col-warning)" />
        </g>
        <Enemy x="120" y="90" scale="1.3" word="LEXICO" />
        <g transform="translate(34 158)">
          <rect width="172" height="22" rx="1" fill="rgba(0,0,0,0.6)" stroke="var(--col-primary)" strokeOpacity="0.5" />
          <text x="10" y="15" className="td-text td-text-primary">LEXIC</text>
          <rect x="52" y="6" width="2" height="11" fill="var(--col-primary)" className="td-blink" />
          <text x="160" y="15" textAnchor="end" className="td-text-sm td-text-dim">5/6</text>
        </g>
      </Frame>
    </svg>
  );
}

export function DiagStatBars() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// PANEL DE PILOTO" tone="primary" />
        <HudBar x="38" y="54" w={164} label="HP"   value={78} color="var(--col-primary)" />
        <HudBar x="38" y="98" w={164} label="FLOW" value={85} color="var(--col-flow)" />
        <text x="120" y="172" textAnchor="middle" className="td-text-sm td-text-dim">esquina inferior izquierda</text>
      </Frame>
    </svg>
  );
}

export function DiagLifeBar() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame tone="danger">
        <Label text="// BARRA DE VIDA" tone="warning" />
        <g transform="translate(20 54)" className="td-pulse-slow">
          <rect x="0" y="0" width="200" height="18" rx="2" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" />
          <rect x="0" y="0" width="150" height="18" rx="2" fill="var(--col-primary)" fillOpacity="0.85" />
          <rect x="0" y="0" width="200" height="4" fill="rgba(255,255,255,0.08)" />
          <text x="100" y="13" textAnchor="middle" className="td-text-sm td-text-primary">HP 78 / 100</text>
        </g>
        <g transform="translate(20 92)">
          <text x="0" y="0" className="td-text-sm td-text-dim">Si baja a cero, pierdes la nave.</text>
          <text x="0" y="18" className="td-text-sm td-text-dim">Los golpes enemigos reducen</text>
          <text x="0" y="36" className="td-text-sm td-text-dim">la barra.</text>
          <text x="0" y="54" className="td-text-sm td-text-warning">Manten el HP alto y elimina</text>
          <text x="0" y="72" className="td-text-sm td-text-warning">amenazas antes que te alcancen.</text>
        </g>
      </Frame>
    </svg>
  );
}

export function DiagProximity() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame tone="warning">
        <Label text="// ALERTA PERIMETRAL" tone="warning" />
        <rect x="20" y="32" width="200" height="148" fill="none" stroke="var(--col-warning)" strokeWidth="3" className="td-pulse" />
        <g stroke="var(--col-danger)" strokeWidth="2.5" className="td-pulse-fast" fill="none">
          <path d="M30 42 L40 42" />
          <path d="M200 42 L210 42" />
          <path d="M30 170 L40 170" />
          <path d="M200 170 L210 170" />
          <path d="M30 42 L30 52" />
          <path d="M210 42 L210 52" />
          <path d="M30 160 L30 170" />
          <path d="M210 160 L210 170" />
        </g>
        <Enemy x="160" y="100" scale="1" />
        <Ship x="70" y="100" scale="1.2" />
        <text x="120" y="160" textAnchor="middle" className="td-text td-text-danger">⚠  INMINENTE</text>
      </Frame>
    </svg>
  );
}

export function DiagWaves() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// PROGRESION DE OLEADAS" tone="primary" />
        <g transform="translate(28 40)">
          <text x="0" y="0" className="td-text-sm td-text-dim">OLEADA</text>
          <text x="0" y="32" className="td-text-xl td-text-primary">07</text>
          <line x1="0" y1="38" x2="46" y2="38" stroke="var(--col-primary)" />
        </g>
        <g transform="translate(135 40)">
          <text x="0" y="0" className="td-text-sm td-text-dim">SCORE</text>
          <text x="0" y="32" className="td-text-xl td-text-primary">12,480</text>
          <line x1="0" y1="38" x2="80" y2="38" stroke="var(--col-primary)" />
        </g>
        <g transform="translate(34 110)">
          {[1,2,3,4,5,6,7,8].map(n => {
            const h = 6 + n * 6;
            const isCurrent = n === 7;
            return (
              <g key={n}>
                <rect x={(n-1)*22} y={60 - h} width="16" height={h}
                  fill={isCurrent ? 'var(--col-primary)' : 'rgba(0,255,204,0.25)'}
                  stroke="var(--col-primary)" strokeOpacity="0.5" strokeWidth="0.5" />
                <text x={(n-1)*22 + 8} y="74" textAnchor="middle" className="td-text-sm"
                  fill={isCurrent ? 'var(--col-primary)' : 'var(--text-dim)'}>{n}</text>
              </g>
            );
          })}
        </g>
        <text x="220" y="120" textAnchor="end" className="td-text-sm td-text-danger">↗ dificultad</text>
      </Frame>
    </svg>
  );
}

export function DiagGrafemas() {
  return (
    <svg viewBox={VB} className="td-svg"><Defs />
      <Frame>
        <Label text="// MONEDA DEL ENJAMBRE" tone="primary" />
        <g transform="translate(120 100)" className="td-pulse-slow">
          <circle r="42" fill="url(#grad-radial)" />
          <circle r="38" fill="rgba(0,0,0,0.6)" stroke="var(--col-primary)" strokeWidth="2" filter="url(#glow-p)" />
          <circle r="32" fill="none" stroke="var(--col-primary)" strokeOpacity="0.4" strokeWidth="0.6" strokeDasharray="3 2" />
          <text x="0" y="14" textAnchor="middle" className="td-text-xxl td-text-primary">₲</text>
          {[0, 60, 120, 180, 240, 300].map(a => (
            <line key={a} transform={`rotate(${a})`} x1="38" y1="0" x2="44" y2="0" stroke="var(--col-primary)" strokeOpacity="0.6" />
          ))}
        </g>
        <g transform="translate(180 50)">
          <rect x="0" y="0" width="42" height="18" rx="2" fill="rgba(0,255,204,0.15)" stroke="var(--col-primary)" />
          <text x="21" y="13" textAnchor="middle" className="td-text-sm td-text-primary">+125</text>
        </g>
        <text x="120" y="180" textAnchor="middle" className="td-text-sm td-text-dim">grafemas · kill · hangar</text>
      </Frame>
    </svg>
  );
}
