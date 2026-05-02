import React from "react";

export default function WarningTriangle({ level, size = "1em" }) {
  if (level === "none") return null;
  return (
    <span
      className={level === "red" ? "deck-warning-red" : "deck-warning-yellow"}
      style={{ fontSize: size }}
    >
      ⚠
    </span>
  );
}
