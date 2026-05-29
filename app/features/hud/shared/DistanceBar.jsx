import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

// Barra de distancia/progreso compartida (jugador izquierda + oponente espejo
// derecha). mirror=true añade el modificador de lado.
export default function DistanceBar({ value = 0, targetDistance = 500, labelKey, mirror = false }) {
  const { t } = useTranslation();
  const pct = Math.min(100, ((value || 0) / Math.max(1, targetDistance || 500)) * 100);
  const near = pct >= 85;

  return (
    <div className={`r-bottom-bar${mirror ? " r-bottom-bar--mirror" : ""}`}>
      <div className="r-distance-row">
        <div className="r-distance-row__lbl">{t(labelKey)}</div>
        <div className="r-distance-row__track-wrap">
          <div className="r-dist-bar">
            <i className={near ? "near" : ""} style={{ height: pct + "%" }} />
          </div>
        </div>
        <div className="r-distance-row__nums">
          {Math.round(value || 0)}
          <span className="r-distance-row__target">/{targetDistance || 500}</span>
        </div>
      </div>
    </div>
  );
}
