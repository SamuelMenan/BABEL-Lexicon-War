import React from "react";
import WarningTriangle from "./WarningTriangle.jsx";

export default function WarningBox({ level, label, detail }) {
  if (level === "none") return null;
  return (
    <div className={`warning-icon warning-icon-${level}`}>
      <WarningTriangle level={level} size="1.1rem" />
      <span className="warning-icon-text">
        <span className="warning-icon-title">{label}</span>
        {detail ? <span className="warning-icon-detail">{detail}</span> : null}
      </span>
    </div>
  );
}
