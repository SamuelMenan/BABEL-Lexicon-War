import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function PreCombatOverlay({ active, step, value, message, level }) {
  const { t } = useTranslation();
  if (!active) return null;
  const engage = step === "engage";

  const displayPhase = engage ? t("hud.overlays.engage") : t("hud.overlays.prepare");
  const displayValue = value && value.startsWith("preCombat.") ? t(value) : (value ?? "...");
  const displayMessage = message && message.startsWith("preCombat.") ? t(message) : message;

  return (
    <div className={`precombat-overlay precombat-overlay-${level}`}>
      <div className={`precombat-frame precombat-frame-${level}`}>
        <span className="precombat-phase">{displayPhase}</span>
        <span className={`precombat-value${engage ? " precombat-value-engage" : ""}`}>{displayValue}</span>
        <span className="precombat-message">{displayMessage}</span>
      </div>
      <div className="precombat-scanline" />
      {engage && <div className="precombat-edge-flash" />}
    </div>
  );
}
