import React from "react";

export default function PreCombatOverlay({ active, step, value, message, level }) {
  if (!active) return null;
  const engage = step === "engage";
  return (
    <div className={`precombat-overlay precombat-overlay-${level}`}>
      <div className={`precombat-frame precombat-frame-${level}`}>
        <span className="precombat-phase">{engage ? "ENGAGE" : "PREPARE"}</span>
        <span className={`precombat-value${engage ? " precombat-value-engage" : ""}`}>{value ?? "..."}</span>
        <span className="precombat-message">{message}</span>
      </div>
      <div className="precombat-scanline" />
      {engage && <div className="precombat-edge-flash" />}
    </div>
  );
}
