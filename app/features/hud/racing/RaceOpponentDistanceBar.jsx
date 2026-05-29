import React from "react";
import DistanceBar from "../shared/DistanceBar.jsx";

// Mirror del DistanceBar — muestra distancia/progreso del oponente en lado derecho.
export default function RaceOpponentDistanceBar({ distanceOpponent = 0, targetDistance = 500 }) {
  return <DistanceBar value={distanceOpponent} targetDistance={targetDistance} labelKey="hud.common.rival" mirror />;
}
