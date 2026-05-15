import React from "react";

const PIPS = 8;

export default function RaceFlowBlock({ flowMultiplier = 1.0, flowStreak = 0, flow = 0, flowActive = false }) {
  const activePips = Math.round((flow / 100) * PIPS);
  const isPeak = flowMultiplier >= 2.0;

  return (
    <div className="r-flow-block">
      <div className="r-flow-block__lbl">FLUJO · LEX</div>
      <div
        className={`r-flow-block__x${isPeak ? " r-flow-block__x--peak" : flowActive ? " r-flow-block__x--active" : ""}`}
      >
        ×{flowMultiplier.toFixed(1)}
      </div>
      {flowStreak > 0 && (
        <div className="r-flow-block__streak">
          RACHA <span className="r-flow-block__streak-n">{flowStreak}</span>
        </div>
      )}
      <div className="r-flow-block__pips">
        {Array.from({ length: PIPS }, (_, i) => (
          <i
            key={`pip-${i}`}
            className={
              i < activePips ? (isPeak ? "r-pip--peak" : "r-pip--on") : ""
            }
          />
        ))}
      </div>
    </div>
  );
}
