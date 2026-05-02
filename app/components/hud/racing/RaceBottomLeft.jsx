import React from "react";

export default function RaceBottomLeft({ flowMultiplier, playerPhrasesCompleted, opponentPhraseProgress }) {
  const oppDone = Math.floor(opponentPhraseProgress);
  const winning = playerPhrasesCompleted > oppDone;
  const flowPct = Math.min(100, ((flowMultiplier - 1.0) / 1.0) * 100);
  const flowColor = flowMultiplier >= 2 ? "#00ff88" : "var(--col-active)";
  const statusColor = winning ? "#00ff88" : "#ff4466";

  return (
    <div className="combat__bottom-left">
      <div className="race__stat-panel">
        <span className="race__stat-panel-label">ESTADO · SPRINT</span>
        <div className="race__stat-row">
          <span className="race__stat-row-label">SECUENCIAS</span>
          <span className="race__stat-row-val" style={{ color: "var(--col-active)" }}>
            {String(playerPhrasesCompleted).padStart(2, "0")}
          </span>
        </div>
        <div className="race__stat-row">
          <span className="race__stat-row-label">OPONENTE</span>
          <span className="race__stat-row-val" style={{ color: winning ? "rgba(255,255,255,0.4)" : "#ff4466" }}>
            {String(oppDone).padStart(2, "0")}
          </span>
        </div>
        <div className="race__stat-row" style={{ marginTop: "0.2rem" }}>
          <span className="race__stat-row-label" style={{ color: statusColor, letterSpacing: "0.15em" }}>
            {winning ? "▲ DELANTE" : "▼ DETRAS"}
          </span>
        </div>
      </div>
      {flowMultiplier > 1.0 && (
        <div className="race__flow-block">
          <span className="race__flow-label">MULTIPLICADOR DE FLUJO</span>
          <span className="race__flow-val" style={{ color: flowColor, textShadow: "0 0 16px " + flowColor }}>
            ×{flowMultiplier.toFixed(1)}
          </span>
          <div className="race__flow-track">
            <div className="race__flow-fill" style={{ width: flowPct + "%", background: flowColor }} />
          </div>
        </div>
      )}
    </div>
  );
}
