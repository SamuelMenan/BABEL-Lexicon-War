import React from "react";

export default function RaceDistanceBar({ distanceTraveled, targetDistance }) {
  const pct = Math.min(100, ((distanceTraveled || 0) / Math.max(1, targetDistance || 500)) * 100);
  const near = pct >= 85;

  return (
    <div className="r-bottom-bar">
      <div className="r-distance-row">
        <div className="r-distance-row__lbl">DIST</div>
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
    </div>
  );
}
