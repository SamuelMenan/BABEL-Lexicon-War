import React from "react";
import { Bridge } from "../../shared/bridge.js";

export default function MatchResult({ score, wpm, accuracy, wave, raceVictory, peakWPM, timeElapsed, gameMode }) {
  const isRacing = gameMode === "racing";
  const restart  = () => window.location.reload();

  if (isRacing) {
    const titleClass = raceVictory ? "match-result__title match-result__title--victory" : "match-result__title match-result__title--defeat";
    const titleText  = raceVictory ? "VICTORIA" : "TIEMPO AGOTADO";
    const subtitle   = raceVictory ? "Transmision completada" : "Transmision interrumpida";
    return (
      <div className="match-result">
        <span className="match-result__label">{subtitle}</span>
        <h1 className={titleClass}>{titleText}</h1>
        <div className="match-result__stats">
          <span className="match-result__stat">Distancia   <span className="match-result__val">{score} / 500</span></span>
          <span className="match-result__stat">WPM pico    <span className="match-result__val">{peakWPM || wpm}</span></span>
          <span className="match-result__stat">WPM final   <span className="match-result__val">{wpm}</span></span>
          <span className="match-result__stat">Precision   <span className="match-result__val">{accuracy}%</span></span>
          {timeElapsed != null && <span className="match-result__stat">Tiempo      <span className="match-result__val">{timeElapsed}s</span></span>}
        </div>
        <p className="match-result__quote">"Las palabras no se acaban.<br />Solo cambian de mano."</p>
        <button className="match-result__btn" onClick={restart}>Volver al menu</button>
      </div>
    );
  }

  return (
    <div className="match-result">
      <span className="match-result__label">Transmision interrumpida</span>
      <h1 className="match-result__title match-result__title--defeat">Fin de partida</h1>
      <div className="match-result__stats">
        <span className="match-result__stat">Oleada alcanzada  <span className="match-result__val">{wave}</span></span>
        <span className="match-result__stat">WPM               <span className="match-result__val">{wpm}</span></span>
        <span className="match-result__stat">Precision         <span className="match-result__val">{accuracy}%</span></span>
      </div>
      <p className="match-result__quote">"Las palabras no se acaban.<br />Solo cambian de mano."</p>
      <button className="match-result__btn" onClick={restart}>Volver al menu</button>
    </div>
  );
}
