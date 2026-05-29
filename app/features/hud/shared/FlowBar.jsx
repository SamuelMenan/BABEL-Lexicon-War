import React from "react";

export default function FlowBar({ flow, active, cooldown }) {
  const pct        = Math.max(0, Math.min(100, flow));
  // Active flow: use ship's bright laser color. Building: ship hud color.
  const fillColor  = active ? "var(--ship-laser, var(--hud-accent))" : "var(--hud-accent, #4d7eff)";
  const glowColor  = active ? "var(--ship-flame, var(--hud-accent))" : "var(--hud-accent, #4d7eff)";
  const trackStyle = active
    ? { position: "relative", background: "rgba(var(--ship-flow-rgb, 0,0,0), 0.35)" }
    : { position: "relative" };
  return (
    <div className="status-bar__row">
      <span className="status-bar__label" style={{ color: "rgba(255,255,255,0.92)" }}>FLOW</span>
      <div className="status-bar__track" style={trackStyle}>
        <div
          className="status-bar__fill"
          style={{ width: pct + "%", background: fillColor, boxShadow: "0 0 12px " + glowColor, opacity: cooldown ? 0.4 : 1 }}
        />
        {active && (
          <div
            className="flow-bar-active-pulse"
            style={{ position: "absolute", inset: 0, background: fillColor, opacity: 0.18 }}
          />
        )}
      </div>
      <span className="status-bar__value" style={{ color: fillColor, textShadow: active ? "0 0 10px " + glowColor : "none" }}>
        {String(Math.round(pct)).padStart(3, "0")}
      </span>
    </div>
  );
}
