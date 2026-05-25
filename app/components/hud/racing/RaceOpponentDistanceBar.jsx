import React from "react";
import useTranslation from "../../../../shared/i18n/useTranslation.js";

// Mirror del DistanceBar — muestra distancia/progreso del oponente en lado derecho.
// Recibe distanceOpponent + targetDistance. Estilo identico al lado izquierdo.
export default function RaceOpponentDistanceBar({ distanceOpponent = 0, targetDistance = 500 }) {
  const { t } = useTranslation();
  const pct = Math.min(100, ((distanceOpponent || 0) / Math.max(1, targetDistance || 500)) * 100);
  const near = pct >= 85;

  return (
    <div className="r-bottom-bar r-bottom-bar--mirror">
      <div className="r-distance-row">
        <div className="r-distance-row__lbl">{t("hud.common.rival")}</div>
        <div className="r-distance-row__track-wrap">
          <div className="r-dist-bar">
            <i className={near ? "near" : ""} style={{ height: pct + "%" }} />
          </div>
        </div>
        <div className="r-distance-row__nums">
          {Math.round(distanceOpponent || 0)}
          <span className="r-distance-row__target">/{targetDistance || 500}</span>
        </div>
      </div>
    </div>
  );
}
