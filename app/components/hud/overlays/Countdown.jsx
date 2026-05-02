import React, { useEffect, useRef, useState } from "react";

export default function Countdown({ countdown, countdownActive }) {
  const [showGo, setShowGo] = useState(false);
  const prevActive = useRef(true);

  useEffect(() => {
    if (prevActive.current && !countdownActive) {
      setShowGo(true);
      setTimeout(() => setShowGo(false), 900);
    }
    prevActive.current = countdownActive;
  }, [countdownActive]);

  if (!countdownActive && !showGo) return null;

  const label = showGo ? "YA!" : countdown > 0 ? String(countdown) : "";
  const col = showGo ? "#00ff88" : "rgba(255,255,255,0.9)";

  return (
    <div className="hud__countdown-overlay">
      <span
        className="hud__countdown-num"
        style={{ color: col, textShadow: `0 0 60px ${col}, 0 0 120px ${col}` }}
      >
        {label}
      </span>
    </div>
  );
}
