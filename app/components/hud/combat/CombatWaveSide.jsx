import React from "react";

// Panel lateral derecho de combate: muestra OLEADA + restos del enjambre.
// Mismo tamaño/altura que CombatWPMSide para balance simetrico.
export default function CombatWaveSide({ wave = 0, swarmRemnants = 0 }) {
  return (
    <div className="r-side r-side--combat-right">
      <div className="r-side__lbl">OLEADA</div>
      <div className="r-side__val">{String(wave || 0).padStart(2, "0")}</div>
      <div className="r-side__sub">
        ENJAMBRE · <span className="r-side__sub-n">{swarmRemnants ?? 0}</span>
      </div>
    </div>
  );
}
