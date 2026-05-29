import React from "react";
import DistanceBar from "../shared/DistanceBar.jsx";

export default function RaceDistanceBar({ distanceTraveled, targetDistance }) {
  return <DistanceBar value={distanceTraveled} targetDistance={targetDistance} labelKey="hud.common.dist" />;
}
