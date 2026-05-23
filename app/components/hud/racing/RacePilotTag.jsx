import React from "react";

export default function RacePilotTag({ pilotName = "PILOTO", pilotSub = "—", shipName = "—" }) {
  return (
    <div className="r-pilot-tag">
      <div className="r-pilot-tag__callsign">{pilotName}</div>
      <div className="r-pilot-tag__rank">{pilotSub}</div>
      <div className="r-pilot-tag__ship">NAVE · {shipName.toUpperCase()}</div>
      <div className="r-pilot-tag__scene">ESCENA · CARRERA</div>
    </div>
  );
}
