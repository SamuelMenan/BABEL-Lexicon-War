import React from "react";

const TICKER_MSG = "◂  FIRMA DEL ENJAMBRE · DETECTADA  ▸  LEXICO · HOSTIL  ▸  PROTOCOLO LEXICO · EN CURSO  ▸  PROGRAMA TYPO · ACTIVO  ▸  ";

export default function CombatTicker() {
  return (
    <div className="hud__ticker">
      <div className="hud__ticker-inner">
        <span className="hud__ticker-text">{TICKER_MSG}{TICKER_MSG}</span>
      </div>
    </div>
  );
}
