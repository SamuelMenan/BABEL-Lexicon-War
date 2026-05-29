import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function CombatTopRight({ accuracy }) {
  const { t } = useTranslation();

  return (
    <div className="combat__top-right">
      <div className="combat__stat-block combat__stat-block--right">
        <div className="combat__acc-row">
          <span className="combat__big-num-2" style={{ color: "var(--col-stat-secondary, var(--col-active))" }}>{accuracy}</span>
          <span className="combat__acc-pct" style={{ color: "var(--col-stat-secondary, var(--col-active))" }}>%</span>
        </div>
        <span className="combat__stat-label">{t("hud.common.precision")}</span>
      </div>
    </div>
  );
}
