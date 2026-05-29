import React from "react";
import WarningBox from "./WarningBox.jsx";
import InfoBox from "./InfoBox.jsx";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function WarningIcon({ warnings, flow = 0, flowActive = false, flowCooldown = false }) {
  const { t } = useTranslation();
  const proximityLevel = warnings?.proximityLevel ?? "none";
  const lowHpLevel = warnings?.lowHpLevel ?? "none";
  const distance = warnings?.closestEnemyDistance;

  const boxes = [];
  const infos = [];

  if (proximityLevel !== "none") {
    boxes.push({
      level: proximityLevel,
      label: proximityLevel === "red" ? t("hud.warnings.objClose") : t("hud.warnings.objNear"),
      detail: `${distance ?? "--"}M`,
    });
  }
  if (lowHpLevel !== "none") {
    boxes.push({ level: lowHpLevel, label: lowHpLevel === "red" ? t("hud.warnings.lifeLow") : t("hud.warnings.lifeMid"), detail: null });
  }

  if (flowActive) {
    // Color hereda paleta de nave activa via CSS var --ship-primary.
    infos.push({ label: t("hud.warnings.flowLex"), detail: t("hud.warnings.active"), color: "var(--ship-primary, var(--col-active, #00ffcc))" });
  } else if (flowCooldown) {
    infos.push({ label: t("hud.warnings.flowRecharge"), detail: null, color: "var(--ship-laser, #4466ff)" });
  } else if (flow >= 70) {
    infos.push({ label: t("hud.warnings.flowSoon"), detail: `${Math.round(flow)}%`, color: "var(--ship-primary, var(--col-active, #00ddff))" });
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
