import React from "react";

export default function StatusBar({ label, value, max = 100, danger = false, forceColor, flash = false }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const col = forceColor ?? (danger && pct <= 35 ? "#ff4466" : "var(--col-active)");
  return (
    <div className={flash ? "status-bar__row status-bar-flash" : "status-bar__row"}>
      <span className="status-bar__label">{label}</span>
      <div className="status-bar__track">
        <div className="status-bar__fill" style={{ width: pct + "%", background: col, boxShadow: "0 0 5px " + col }} />
      </div>
      <span className="status-bar__value" style={{ color: col }}>{String(Math.round(value)).padStart(3, "0")}</span>
    </div>
  );
}
