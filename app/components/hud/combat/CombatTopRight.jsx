import React from "react";

export default function CombatTopRight({ wpm, accuracy }) {
  const wpmCol = wpm >= 60 ? "var(--col-stat-primary, var(--col-active))"
    : wpm >= 30 ? "#ffcc00"
    : wpm > 0 ? "#ff6644"
    : "rgba(255,255,255,0.35)";

  return (
    <div className="combat__top-right">
      <div className="combat__stat-block">
        <span
          className="combat__big-num"
          style={{ color: wpmCol, textShadow: wpm >= 60 ? "0 0 20px " + wpmCol : "none" }}
        >
          {wpm}
        </span>
        <span className="combat__stat-label">PPM</span>
      </div>
      <div className="combat__stat-block combat__stat-block--right">
        <div className="combat__acc-row">
          <span className="combat__big-num-2" style={{ color: "var(--col-stat-secondary, var(--col-active))" }}>{accuracy}</span>
          <span className="combat__acc-pct" style={{ color: "var(--col-stat-secondary, var(--col-active))" }}>%</span>
        </div>
        <span className="combat__stat-label">PRECISION</span>
      </div>
    </div>
  );
}
