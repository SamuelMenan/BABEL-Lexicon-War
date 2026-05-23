import React from "react";
import StatusBar from "../shared/StatusBar.jsx";
import FlowBar from "../shared/FlowBar.jsx";

export default function CombatBottomLeft({ hp, flow = 0, flowActive = false, flowCooldown = false, wave, swarmRemnants, warnings }) {
  const lowHpLevel = warnings?.lowHpLevel ?? "none";
  const hpForceColor = lowHpLevel === "red" ? "#ff4466" : lowHpLevel === "yellow" ? "#ffcc00" : undefined;

  return (
    <div className="combat__bottom-left">
      <StatusBar label="VIDA" value={hp} danger forceColor={hpForceColor} flash={lowHpLevel === "red"} />
      <FlowBar flow={flow} active={flowActive} cooldown={flowCooldown} />
    </div>
  );
}
