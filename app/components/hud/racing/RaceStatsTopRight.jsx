import React from "react";

export default function RaceStatsTopRight({ wpm, accuracy }) {
  const wpmClass = wpm >= 60 ? "r-stat__val--accent" : wpm > 0 && wpm < 30 ? "r-stat__val--crit" : "";
  const accClass = accuracy < 85 ? "r-stat__val--crit" : "";
  const wpmBarPct = Math.min(100, (wpm / 120) * 100);
  const accBarPct = Math.min(100, accuracy);

  return (
    <div className="r-topright">
      <div className="r-stat">
        <div className={`r-stat__val ${wpmClass}`}>
          {wpm}
          <span className="r-stat__sub">ppm</span>
        </div>
        <div className="r-stat__lbl">VELOCIDAD</div>
        <div className="r-stat__bar">
          <i style={{ width: wpmBarPct + "%" }} />
        </div>
      </div>
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
