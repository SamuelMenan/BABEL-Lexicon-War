import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

// Panel lateral derecho de combate: muestra OLEADA + restos del enjambre.
// Mismo tamaño/altura que CombatWPMSide para balance simetrico.
export default function CombatWaveSide({ wave = 0, swarmRemnants = 0 }) {
  const { t } = useTranslation();

  return (
    <div className="r-side r-side--combat-right">
      <div className="r-side__lbl">{t("hud.common.wave")}</div>
      <div className="r-side__val">{String(wave || 0).padStart(2, "0")}</div>
      <div className="r-side__sub">
        {t("hud.combat.swarm")} · <span className="r-side__sub-n">{swarmRemnants ?? 0}</span>
      </div>
    </div>
  );
}
