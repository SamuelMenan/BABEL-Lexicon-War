import React from "react";
import useTranslation from "../../../../shared/i18n/useTranslation.js";

export default function WaveAnnouncement({ wave }) {
  const { t } = useTranslation();
  if (!wave) return null;
  const isHighWave = wave >= 8;
  return (
    <div className={"wave-fullscreen" + (isHighWave ? " wave-fullscreen-danger" : "")}>
      <div className="wave-fullscreen-inner">
        <span className="wave-fullscreen-tag">{isHighWave ? t("hud.overlays.waveAlert") : t("hud.overlays.newWave")}</span>
        <span className="wave-fullscreen-num">{String(wave).padStart(2, "0")}</span>
        <span className="wave-fullscreen-sub">
          {isHighWave ? t("hud.overlays.highWaveSub") : t("hud.overlays.lowWaveSub")}
        </span>
      </div>
    </div>
  );
}
