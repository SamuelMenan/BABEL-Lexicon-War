import React from "react";

export default function InfoBox({ label, detail, color = "#00ff88" }) {
  return (
    <div
      className="info-icon"
      style={{ borderColor: color + "55", color, boxShadow: `0 0 14px ${color}22` }}
    >
      <span className="warning-icon-mark">◈</span>
      <span className="warning-icon-text">
        <span className="warning-icon-title">{label}</span>
        {detail ? <span className="warning-icon-detail">{detail}</span> : null}
      </span>
    </div>
  );
}
