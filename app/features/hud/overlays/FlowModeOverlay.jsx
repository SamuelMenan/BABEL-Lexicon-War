import React, { useEffect, useRef, useState } from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

// Aviso de FLUJO DESBLOQUEADO — hereda paleta de la nave activa via CSS vars
// (--ship-flame, --ship-flame-rgb, --ship-ring-rgb). Sin colores hardcoded.
export default function FlowModeOverlay({ flowActive }) {
  const { t } = useTranslation();
  const [showPopup, setShowPopup] = useState(false);
  const prevActive = useRef(false);

  useEffect(() => {
    let timerId;
    if (!prevActive.current && flowActive) {
      setShowPopup(true);
      timerId = setTimeout(() => setShowPopup(false), 1600);
    }
    prevActive.current = flowActive;
    return () => { if (timerId) clearTimeout(timerId); };
  }, [flowActive]);

  if (!showPopup) return null;

  // Fallback al color del HUD si las vars no estuvieran (no deberia pasar en runtime).
  const flameRgb = "var(--ship-flame-rgb, var(--ship-hud-rgb, 0,255,204))";
  const ringRgb  = "var(--ship-ring-rgb,  var(--ship-hud-rgb, 0,255,204))";
  const flameHex = "var(--ship-flame, var(--col-active, #00ffcc))";

  return (
    <div
      className="precombat-overlay"
      style={{
        background: `radial-gradient(circle at center, rgba(${flameRgb},0.15) 0%, rgba(0,0,0,0.52) 62%, rgba(0,0,0,0.7) 100%)`,
        zIndex: 40,
      }}
    >
      <div
        className="precombat-frame"
        style={{
          borderColor: `rgba(${ringRgb},0.6)`,
          animation: "precombat-number-pop 0.24s ease-out, flow-frame-pulse-anim 0.4s ease-in-out infinite",
        }}
      >
        <span className="precombat-phase" style={{ color: "rgba(255,255,255,0.85)", textShadow: `0 0 10px rgba(${ringRgb},0.6)` }}>
          {t("hud.overlays.flowUnlocked")}
        </span>
        <span className="precombat-value" style={{ color: flameHex, textShadow: `0 0 30px rgba(${flameRgb},0.9), 0 0 90px rgba(${flameRgb},0.6)` }}>
          100%
        </span>
        <span className="precombat-message" style={{ color: "#fff", textShadow: `0 0 10px rgba(${ringRgb},0.6)` }}>
          {t("hud.overlays.flowSync")}
        </span>
      </div>
      <div
        className="precombat-scanline"
        style={{ background: `rgba(${ringRgb},0.4)`, boxShadow: `0 0 20px rgba(${ringRgb},0.6)` }}
      />
    </div>
  );
}
