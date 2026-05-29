import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function LowHpFrame({ level }) {
  const { t } = useTranslation();
  if (level === "none") return null;
  return (
    <div className={`low-hp-frame low-hp-frame-${level}`}>
      <div className="low-hp-frame-corner low-hp-frame-corner-tl" />
      <div className="low-hp-frame-corner low-hp-frame-corner-tr" />
      <div className="low-hp-frame-corner low-hp-frame-corner-bl" />
      <div className="low-hp-frame-corner low-hp-frame-corner-br" />
      <div className="low-hp-frame-scan low-hp-frame-scan-top" />
      <div className="low-hp-frame-scan low-hp-frame-scan-bottom" />
      <div className="low-hp-frame-caption">{level === "red" ? t("hud.overlays.hullCritical") : t("hud.overlays.hullLow")}</div>
    </div>
  );
}
