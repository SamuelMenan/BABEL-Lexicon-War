import React from "react";
import useTranslation from "../../../../shared/i18n/useTranslation.js";

// Panel lateral izquierdo con PPM (WPM). Mismo tamaño que RaceTimeSide.
export default function RaceWPMSide({ wpm = 0 }) {
  const { t } = useTranslation();
  const cls = wpm >= 60 ? "r-side--accent" : wpm > 0 && wpm < 30 ? "r-side--crit" : "";
  const barPct = Math.min(100, (wpm / 120) * 100);
  return (
    <div className={`r-side r-side--left ${cls}`}>
      <div className="r-side__lbl">{t("hud.common.wpm")}</div>
      <div className="r-side__val">{wpm}</div>
      <div className="r-side__bar">
        <i style={{ width: barPct + "%" }} />
      </div>
    </div>
  );
}
