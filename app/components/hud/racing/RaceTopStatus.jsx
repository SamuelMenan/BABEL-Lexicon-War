import React from "react";

export default function RaceTopStatus({ wave, playerPhrasesCompleted }) {
  return (
    <div className="r-top-status">
      <span className="r-top-status__live">EN VIVO</span>
      <span className="r-top-status__sep">·</span>
      <span>BABEL · CARRERA</span>
      <span className="r-top-status__sep">·</span>
      <span>
        OLEADA{" "}
        <span className="r-top-status__accent">
          {String(wave || 0).padStart(2, "0")}
        </span>
      </span>
      <span className="r-top-status__sep">·</span>
      <span>
        FRASES{" "}
        <span className="r-top-status__accent">{playerPhrasesCompleted || 0}</span>
      </span>
    </div>
  );
}
