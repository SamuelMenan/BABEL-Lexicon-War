import React from "react";
import WarningTriangle from "../warnings/WarningTriangle.jsx";
import { getProximityLevel } from "../../../../game/systems/hudUtils.js";

export default function LexiconDeck({ combatEnemies, targetId, flowMultiplier, mirror = false }) {
  // Dedupe defensivo por id (evita duplicacion si el payload llega con repetidos).
  const seen = new Set();
  const unique = [];
  for (const e of (combatEnemies || [])) {
    if (!e || !e.id || seen.has(e.id)) continue;
    seen.add(e.id);
    unique.push(e);
  }
  const sorted = unique.sort((a, b) => a.distance - b.distance);
  const flowColor = "var(--col-multiplier, var(--col-active))";

  return (
    <div className={`lexicon-deck${mirror ? " lexicon-deck--mirror" : ""}`}>
      <div className="lexicon-deck__header">
        <span className="lexicon-deck__header-label">MAZO · LEXICO</span>
        <span className="lexicon-deck__header-count" style={{ color: "var(--col-deck-count, var(--col-active))" }}>{sorted.length}</span>
      </div>
      <div className="lexicon-deck__list">
        {sorted.slice(0, 6).map((e) => (
          <div key={e.id} className={`lexicon-deck__row${e.targeted ? " lexicon-deck__row--active" : ""}`}>
            <span className="lexicon-deck__bullet" style={e.targeted ? { color: "var(--col-bullet, var(--col-active))" } : undefined}>{e.targeted ? "▸" : " "}</span>
            <span
              className="lexicon-deck__word"
              style={{
                color: e.targeted ? "var(--col-active)" : "rgba(255,255,255,0.55)",
                fontWeight: e.targeted ? "bold" : "normal",
              }}
            >
              {e.word}
            </span>
            <span className="lexicon-deck__dist-wrap">
              <WarningTriangle level={getProximityLevel(e.distance)} />
              <span className="lexicon-deck__dist">{e.distance}m</span>
            </span>
          </div>
        ))}
        {sorted.length === 0 && <div className="lexicon-deck__empty">· LIMPIO ·</div>}
      </div>
      {flowMultiplier > 1.0 && (
        <div className="lexicon-deck__flow">
          <span className="lexicon-deck__flow-label">MULTIPLICADOR DE FLUJO</span>
          <span className="lexicon-deck__flow-val" style={{ color: flowColor, textShadow: "0 0 14px " + flowColor }}>
            ×{flowMultiplier.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
}
