import React from "react";

export default function FlowBar({ flow, active, cooldown }) {
  const pct = Math.max(0, Math.min(100, flow));
  const color = active ? "#9966ff"
    : pct >= 75 ? "#8855ff"
    : pct >= 50 ? "#7744ff"
    : pct >= 25 ? "#aa77ff"
    : "#cc99ff";
  return (
    <div className="status-bar__row">
      <span className="status-bar__label" style={{ color: "rgba(255,255,255,0.92)" }}>FLOW</span>
      <div className="status-bar__track" style={{ position: "relative" }}>
        <div
          className="status-bar__fill"
          style={{ width: pct + "%", background: color, boxShadow: "0 0 12px " + color, opacity: cooldown ? 0.4 : 1 }}
        />
        {active && (
          <div
            className="flow-bar-active-pulse"
            style={{ position: "absolute", inset: 0, background: color, opacity: 0.18 }}
          />
        )}
      </div>
      <span className="status-bar__value" style={{ color }}>{String(Math.round(pct)).padStart(3, "0")}</span>
    </div>
  );
}
