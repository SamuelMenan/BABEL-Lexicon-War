import React, { useEffect, useState } from "react";

export default function RaceRunStats({ playerPhrasesCompleted, wpm }) {
  const [peakWPM, setPeakWPM] = useState(0);

  useEffect(() => {
    if (wpm > peakWPM) setPeakWPM(wpm);
  }, [wpm]);

  return (
    <div className="r-run-stats">
      <div className="r-run-stats__lvl">SESION · ACTIVA</div>
      <div className="r-run-stats__row">
        <span className="r-run-stats__num">{playerPhrasesCompleted || 0}</span>
        <span className="r-run-stats__micro">FRASES</span>
      </div>
      <div className="r-run-stats__peak">
        PICO PPM <span className="r-run-stats__peak-n">{peakWPM}</span>
      </div>
    </div>
  );
}
