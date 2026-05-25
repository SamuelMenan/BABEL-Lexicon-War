import React from "react";
import useTranslation from "../../../../shared/i18n/useTranslation.js";

export default function RaceTopStatus({ wave, playerPhrasesCompleted }) {
  const { t } = useTranslation();

  return (
    <div className="r-top-status">
      <span className="r-top-status__live">{t("hud.racing.live")}</span>
      <span className="r-top-status__sep">·</span>
      <span>{t("hud.racing.babelRace")}</span>
      <span className="r-top-status__sep">·</span>
      <span>
        {t("hud.common.wave")}{" "}
        <span className="r-top-status__accent">
          {String(wave || 0).padStart(2, "0")}
        </span>
      </span>
      <span className="r-top-status__sep">·</span>
      <span>
        {t("hud.common.phrases")}{" "}
        <span className="r-top-status__accent">{playerPhrasesCompleted || 0}</span>
      </span>
    </div>
  );
}
