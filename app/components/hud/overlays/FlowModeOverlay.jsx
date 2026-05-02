import React, { useEffect, useRef, useState } from "react";

export default function FlowModeOverlay({ flowActive }) {
  const [showPopup, setShowPopup] = useState(false);
  const prevActive = useRef(false);

  useEffect(() => {
    if (!prevActive.current && flowActive) {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 1600);
    }
    prevActive.current = flowActive;
  }, [flowActive]);

  if (!showPopup) return null;

  return (
    <div
      className="precombat-overlay"
      style={{
        background: "radial-gradient(circle at center, rgba(153,0,255,0.15) 0%, rgba(0,0,0,0.52) 62%, rgba(0,0,0,0.7) 100%)",
        zIndex: 40,
      }}
    >
      <div
        className="precombat-frame"
        style={{
          borderColor: "rgba(204,0,255,0.6)",
          animation: "precombat-number-pop 0.24s ease-out, flow-frame-pulse-anim 0.4s ease-in-out infinite",
        }}
      >
        <span className="precombat-phase" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 0 10px rgba(204,0,255,0.6)" }}>
          FLUJO DESBLOQUEADO
        </span>
        <span className="precombat-value" style={{ color: "#e888ff", textShadow: "0 0 30px rgba(204,0,255,0.9), 0 0 90px rgba(204,0,255,0.6)" }}>
          100%
        </span>
        <span className="precombat-message" style={{ color: "#fff", textShadow: "0 0 10px rgba(204,0,255,0.6)" }}>
          SINCRONIZACIÓN LÉXICA ACTIVA
        </span>
      </div>
      <div
        className="precombat-scanline"
        style={{ background: "rgba(204,0,255,0.4)", boxShadow: "0 0 20px rgba(204,0,255,0.6)" }}
      />
    </div>
  );
}
