import React from "react";

export default function RaceTicker({ timeRemaining, playerPhrasesCompleted }) {
  const s = Math.max(0, Math.round(timeRemaining ?? 60));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const seqs = String(playerPhrasesCompleted || 0).padStart(2, "0");
  const msg = `◂  PROTOCOLO · SPRINT · ACTIVO  ▸  SECUENCIAS · ${seqs} · TRANSMITIDAS  ▸  TIEMPO · ${mm}:${ss} · RESTANTE  ▸  SISTEMA · FLUJO · ESTABLE  ▸  `;
  return (
    <div className="hud__ticker">
      <div className="hud__ticker-inner">
        <span className="hud__ticker-text">{msg}{msg}</span>
      </div>
    </div>
  );
}
