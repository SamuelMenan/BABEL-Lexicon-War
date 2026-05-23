import React from "react";

// Panel lateral derecho con tiempo restante. Mismo tamaño que RaceWPMSide.
export default function RaceTimeSide({ timeRemaining = 60 }) {
  const s = Math.max(0, Math.round(timeRemaining));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const cls = s <= 10 ? "r-side--crit" : s <= 20 ? "r-side--warn" : "";
  return (
    <div className={`r-side r-side--right ${cls}`}>
      <div className="r-side__lbl">TIEMPO</div>
      <div className="r-side__val">{mm}:{ss}</div>
    </div>
  );
}
