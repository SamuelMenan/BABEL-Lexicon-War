import React, { useEffect, useState } from "react";
import { EventBus } from "../../../../shared/events.js";
import { EventTypes } from "../../../../shared/eventTypes.js";

export default function ActiveWord({ activeWord, animState }) {
  const [poppedIdx, setPoppedIdx] = useState(-1);
  const [wrongIdx, setWrongIdx] = useState(-1);

  useEffect(() => {
    return EventBus.on(EventTypes.WORD_PROGRESS, ({ typed, correct, errorAt }) => {
      if (correct && typed.length > 0) {
        const idx = typed.length - 1;
        setPoppedIdx(idx);
        setTimeout(() => setPoppedIdx(-1), 200);
      } else if (!correct && typeof errorAt === "number") {
        setWrongIdx(errorAt);
        setTimeout(() => setWrongIdx(-1), 220);
      }
    });
  }, []);

  if (!activeWord) {
    return (
      <div className="hud__word-zone">
        <span className="hud__word-idle">_ _ _ _ _ _ _</span>
      </div>
    );
  }

  const { word, typed } = activeWord;
  const progress = typed.length / word.length;
  const progressBg = animState === "wrong" ? "#ff2244" : "var(--col-active)";
  const progressGlow = animState === "wrong" ? "0 0 10px #ff2244" : "0 0 8px var(--col-active)";

  return (
    <div className="hud__word-zone">
      <div className={"word-area-" + animState} style={{ display: "flex", gap: "0.04rem", alignItems: "baseline" }}>
        {word.split("").map((ch, i) => {
          const done = i < typed.length;
          const current = i === typed.length;
          const popped = i === poppedIdx;
          const wrong = i === wrongIdx;
          const letterColor = done ? "var(--col-active)" : current ? "var(--col-pending)" : "var(--col-ghost-letter)";
          return (
            <span
              key={word + "-" + i}
              className={`hud__letter${wrong ? " letter-wrong" : popped ? " letter-popped" : ""}`}
              style={{ color: letterColor, textShadow: done ? "0 0 14px var(--col-active)" : "none" }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div className="hud__progress-track">
        <div
          className="hud__progress-fill"
          style={{ width: progress * 100 + "%", background: progressBg, boxShadow: progressGlow }}
        />
      </div>
    </div>
  );
}
