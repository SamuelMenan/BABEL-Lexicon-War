import React from "react";

const LEFT_LINES = [
  { top: "18%", width: 110, delay: 0 },
  { top: "32%", width: 75, delay: 0.45 },
  { top: "51%", width: 130, delay: 0.85 },
  { top: "65%", width: 90, delay: 1.1 },
  { top: "75%", width: 105, delay: 0.2 },
];

const RIGHT_LINES = [
  { top: "28%", width: 95, delay: 0.3 },
  { top: "45%", width: 120, delay: 0.75 },
  { top: "60%", width: 80, delay: 1.05 },
];

export default function RaceSpeedLines({ flowActive }) {
  return (
    <div className="r-speed-lines" style={{ opacity: flowActive ? 0.85 : 0.4 }}>
      {LEFT_LINES.map((l) => (
        <div
          key={`l-${l.top}-${l.width}-${l.delay}`}
          className="r-speed-lines__ln"
          style={{ top: l.top, width: l.width, animationDelay: l.delay + "s" }}
        />
      ))}
      {RIGHT_LINES.map((l) => (
        <div
          key={`r-${l.top}-${l.width}-${l.delay}`}
          className="r-speed-lines__ln r-speed-lines__ln--right"
          style={{ top: l.top, width: l.width, animationDelay: l.delay + "s" }}
        />
      ))}
    </div>
  );
}
