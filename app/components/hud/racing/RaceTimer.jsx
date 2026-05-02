import React from "react";

export default function RaceTimer({ timeRemaining }) {
  const s = Math.max(0, Math.round(timeRemaining));
  const timePct = Math.min(100, ((60 - s) / 60) * 100);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const col = s <= 10 ? "#ff4466" : s <= 20 ? "#ffcc00" : "var(--col-active)";
  const fillBg = s <= 10 ? "#ff4466" : s <= 20 ? "#ffcc00" : "linear-gradient(90deg,#00ffcc,#00ff88)";

  return (
    <div className="race__timer-panel">
      <span className="race__timer-label">TIEMPO · RESTANTE</span>
      <span
        className="race__timer-num"
        style={{
          color: col,
          textShadow: "0 0 20px " + col,
          animation: s <= 10 ? "blink 0.5s step-end infinite" : "none",
        }}
      >
        {mm}:{ss}
      </span>
      <div className="race__timer-track">
        <div className="race__timer-fill" style={{ width: (100 - timePct) + "%", background: fillBg }} />
      </div>
    </div>
  );
}
