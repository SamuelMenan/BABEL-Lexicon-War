import React from "react";
import WarningBox from "./WarningBox.jsx";
import InfoBox from "./InfoBox.jsx";

export default function WarningIcon({ warnings, flow = 0, flowActive = false, flowCooldown = false }) {
  const proximityLevel = warnings?.proximityLevel ?? "none";
  const lowHpLevel = warnings?.lowHpLevel ?? "none";
  const distance = warnings?.closestEnemyDistance;

  const boxes = [];
  const infos = [];

  if (proximityLevel !== "none") {
    boxes.push({
      level: proximityLevel,
      label: proximityLevel === "red" ? "OBJETO CERCANO" : "OBJETO CERCA",
      detail: `${distance ?? "--"}M`,
    });
  }
  if (lowHpLevel !== "none") {
    boxes.push({ level: lowHpLevel, label: lowHpLevel === "red" ? "VIDA BAJA" : "VIDA MEDIA", detail: null });
  }

  if (flowActive) {
    // Color hereda paleta de nave activa vía CSS var --ship-primary.
    infos.push({ label: "FLUJO·LEX", detail: "ACTIVO", color: "var(--ship-primary, var(--col-active, #00ffcc))" });
  } else if (flowCooldown) {
    infos.push({ label: "RECARGA·LEX", detail: null, color: "var(--ship-laser, #4466ff)" });
  } else if (flow >= 70) {
    infos.push({ label: "FLUJO PRÓXIMO", detail: `${Math.round(flow)}%`, color: "var(--ship-primary, var(--col-active, #00ddff))" });
  }

  if (boxes.length === 0 && infos.length === 0) return null;

  return (
    <div className="warning-stack">
      {boxes.map((box) => (
        <WarningBox key={`${box.label}-${box.detail ?? "x"}`} level={box.level} label={box.label} detail={box.detail} />
      ))}
      {infos.map((info) => (
        <InfoBox key={info.label} label={info.label} detail={info.detail} color={info.color} />
      ))}
    </div>
  );
}
