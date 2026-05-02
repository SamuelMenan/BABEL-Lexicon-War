import React from "react";

export default function RaceDistanceBar({ distanceTraveled, targetDistance, timeRemaining }) {
  const pct = Math.min(100, ((distanceTraveled || 0) / Math.max(1, targetDistance || 500)) * 100);
  const near = pct >= 85;
  const s = Math.max(0, Math.round(timeRemaining ?? 60));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const timeClass = s <= 10 ? "r-timer-row__time--crit" : s <= 20 ? "r-timer-row__time--warn" : "";

  return (
    <div className="r-bottom-bar">
      <div className="r-distance-row">
        <div className="r-distance-row__lbl">DISTANCIA</div>
        <div className="r-distance-row__track-wrap">
          <div className="r-dist-bar">
            <i className={near ? "near" : ""} style={{ height: pct + "%" }} />
          </div>
        </div>
        <div className="r-distance-row__nums">
          {Math.round(distanceTraveled || 0)}
          <span className="r-distance-row__target">/{targetDistance || 500}</span>
        </div>
      </div>
      <div className="r-timer-row">
        <div className="r-timer-row__lbl">TIEMPO</div>
        <div className={`r-timer-row__time ${timeClass}`}>
          {mm}:{ss}
        </div>
      </div>
    </div>
  );
}
