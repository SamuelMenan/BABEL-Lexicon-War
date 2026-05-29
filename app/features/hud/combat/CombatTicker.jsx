import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function CombatTicker() {
  const { t } = useTranslation();
  const tickerMsg = t("hud.combat.ticker");

  return (
    <div className="hud__ticker">
      <div className="hud__ticker-inner">
        <span className="hud__ticker-text">{tickerMsg}{tickerMsg}</span>
      </div>
    </div>
  );
}
