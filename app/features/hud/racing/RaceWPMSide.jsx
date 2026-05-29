import React from "react";
import WpmSide from "../shared/WpmSide.jsx";

// Panel lateral izquierdo con PPM (WPM). Mismo tamaño que RaceTimeSide.
export default function RaceWPMSide({ wpm = 0 }) {
  return <WpmSide wpm={wpm} variantClass="r-side--left" />;
}
