import React, { useEffect, useState } from "react";
import useTranslation from "../../../../shared/i18n/useTranslation.js";

export default function RaceRunStats({ playerPhrasesCompleted, wpm }) {
  const { t } = useTranslation();
  const [peakWPM, setPeakWPM] = useState(0);

  useEffect(() => {
    if (wpm > peakWPM) setPeakWPM(wpm);
  }, [wpm]);

  return (
    <div className="r-run-stats">
      <div className="r-run-stats__lvl">{t("hud.racing.sessionActive")}</div>
      <div className="r-run-stats__row">
        <span className="r-run-stats__num">{playerPhrasesCompleted || 0}</span>
        <span className="r-run-stats__micro">{t("hud.common.phrases")}</span>
      </div>
      <div className="r-run-stats__peak">
        {t("hud.racing.peakWpm")} <span className="r-run-stats__peak-n">{peakWPM}</span>
      </div>
    </div>
  );
}
