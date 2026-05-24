import React, { useEffect, useState } from 'react';

const MESSAGES = [
  'ACCEDIENDO A HANGAR · TYPO',
  'ESCANEANDO UNIDADES DISPONIBLES',
  'VERIFICANDO FIRMA LÉXICA',
  'CALIBRANDO SINCRONIZACIÓN DE PILOTO',
  'PREPARANDO DESPLIEGUE · EN ESPERA',
];

export default function ShipSelectLoadingScreen({ progress = 0 }) {
  const [cursorOn, setCursorOn]   = useState(true);
  const [msgIdx,   setMsgIdx]     = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 480);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setMsgIdx(v => (v + 1) % MESSAGES.length), 900);
    return () => clearInterval(id);
  }, []);

  const pct    = Math.round(Math.max(0, Math.min(100, progress)));
  const isDone = pct >= 100;

  const pctNumStyle = {
    color:      isDone ? '#00ff88' : '#00ffcc',
    textShadow: isDone ? '0 0 22px #00ff88' : '0 0 14px #00ffcc88',
  };

  return (
    <div className="loading-root">
      <div className="loading-grid" />

      <div className="loading-panel">
        <div className="loading-title">
          <span className="loading-title__main">BABEL</span>
          <span className="loading-title__colon">:</span>
          <span className="loading-title__sub">LEXICON WAR</span>
        </div>

        <div className="loading-hairline" />

        <div className="loading-mode-badge">
          <span className="loading-mode-badge__text">SELECCIÓN · DE · NAVE</span>
        </div>

        <div className="loading-hairline" />

        <div className="loading-message-row">
          <span className="loading-message__diamond">◊</span>
          <span className="loading-message__text">{MESSAGES[msgIdx]}</span>
          <span className="loading-message__cursor" style={{ opacity: cursorOn ? 1 : 0 }}>█</span>
        </div>

        <div className={`loading-bar-track${pct > 0 && !isDone ? ' loading-bar-active' : ''}`}>
          <div className="loading-bar-fill" style={{ width: pct + '%' }}>
            {pct > 2 && pct < 98 && <div className="loading-bar-scan" />}
          </div>
        </div>

        <div className="loading-pct-row">
          <span className="loading-pct__sep">────────────────────────</span>
          <span className="loading-pct__num" style={pctNumStyle}>
            {String(pct).padStart(3, '0')}
          </span>
          <span className="loading-pct__symbol">%</span>
          <span className="loading-pct__sep">────────────────────────</span>
        </div>

        <div className="loading-hairline" />

        <div className="loading-quote">
          <p className="loading-quote__line">"Error de sintaxis.</p>
          <p className="loading-quote__line">&nbsp;Coincidencia fallida."</p>
          <p className="loading-quote__attr">- LYRA VOSS · ÚLTIMA TRANSMISIÓN</p>
        </div>
      </div>

      <div className="loading-footer">
        <span className="loading-footer__text">PROGRAMA · TYPO · ACTIVO</span>
        <span className="loading-footer__sep">|</span>
        <span className="loading-footer__text">ELIGE TU NAVE · ANTES DEL DESPLIEGUE</span>
        <span className="loading-footer__sep">|</span>
        <span className="loading-footer__text">KAEL · VOSS</span>
      </div>
    </div>
  );
}
