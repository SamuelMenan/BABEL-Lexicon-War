import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function RacePilotTag({ pilotName = "PILOTO", pilotSub = "—", shipName = "—" }) {
  const { t } = useTranslation();

  return (
    <div className="r-pilot-tag">
      <div className="r-pilot-tag__callsign">{pilotName}</div>
      <div className="r-pilot-tag__rank">{pilotSub}</div>
      <div className="r-pilot-tag__ship">{t("hud.common.ship")} · {shipName.toUpperCase()}</div>
      <div className="r-pilot-tag__scene">{t("hud.common.sceneRace")}</div>
    </div>
  );
}
