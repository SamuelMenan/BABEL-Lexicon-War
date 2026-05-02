import React from "react";

export default function WaveAnnouncement({ wave }) {
  if (!wave) return null;
  const isHighWave = wave >= 8;
  return (
    <div className={"wave-fullscreen" + (isHighWave ? " wave-fullscreen-danger" : "")}>
      <div className="wave-fullscreen-inner">
        <span className="wave-fullscreen-tag">{isHighWave ? "ALERTA DE OLEADA" : "NUEVA OLEADA"}</span>
        <span className="wave-fullscreen-num">{String(wave).padStart(2, "0")}</span>
        <span className="wave-fullscreen-sub">
          {isHighWave ? "RIESGO CRITICO · PRESION MAXIMA" : "EL ENJAMBRE AVANZA"}
        </span>
      </div>
    </div>
  );
}
