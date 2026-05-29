import React from "react";
import WpmSide from "../shared/WpmSide.jsx";

export default function CombatWPMSide({ wpm = 0 }) {
  return <WpmSide wpm={wpm} variantClass="r-side--combat-left" />;
}
