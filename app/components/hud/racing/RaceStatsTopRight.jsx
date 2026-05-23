import React from "react";

export default function RaceStatsTopRight({ accuracy }) {
  const accClass = accuracy < 85 ? "r-stat__val--crit" : "";
  const accBarPct = Math.min(100, accuracy);

  return (
    <div className="r-topright">
      <div className="r-stat">
        <div className={`r-stat__val ${accClass}`}>
          {accuracy}
          <span className="r-stat__sub">%</span>
        </div>
        <div className="r-stat__lbl">PRECISION</div>
        <div className="r-stat__bar">
          <i style={{ width: accBarPct + "%" }} />
        </div>
      </div>
    </div>
  );
}
