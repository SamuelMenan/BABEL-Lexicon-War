import React from "react";
import { Bridge } from "../../shared/bridge.js";

const s = {
  overlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'rgba(0,0,8,0.92)', fontFamily: "'Orbitron', sans-serif" },
  label:   { fontSize: '0.75rem', color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase' },
  title:   { fontSize: '2.5rem', letterSpacing: '0.4em', textTransform: 'uppercase' },
  stat:    { fontSize: '1rem', color: '#888', letterSpacing: '0.15em' },
  val:     { color: '#00ffcc' },
  quote:   { fontSize: '0.8rem', color: '#444', fontStyle: 'italic', maxWidth: '380px', textAlign: 'center', lineHeight: 1.8, marginTop: '0.5rem' },
  btn:     { marginTop: '1rem', fontFamily: "'Orbitron', sans-serif", fontSize: '0.9rem', color: '#000', background: '#00ffcc', border: 'none', padding: '0.65rem 2rem', cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase' },
}

export default function MatchResult({ score, wpm, accuracy, wave, raceVictory, peakWPM, timeElapsed, gameMode }) {
  const isRacing = gameMode === "racing";
  const restart  = () => window.location.reload();

  if (isRacing) {
    const titleColor = raceVictory ? "#00ff88" : "#ff4466";
    const titleText  = raceVictory ? "VICTORIA" : "TIEMPO AGOTADO";
    const subtitle   = raceVictory ? "Transmision completada" : "Transmision interrumpida";
    return (
      <div style={s.overlay}>
        <span style={s.label}>{subtitle}</span>
        <h1 style={{ ...s.title, color: titleColor }}>{titleText}</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
          <span style={s.stat}>Distancia   <span style={s.val}>{score} / 500</span></span>
          <span style={s.stat}>WPM pico    <span style={s.val}>{peakWPM || wpm}</span></span>
          <span style={s.stat}>WPM final   <span style={s.val}>{wpm}</span></span>
          <span style={s.stat}>Precision   <span style={s.val}>{accuracy}%</span></span>
          {timeElapsed != null && <span style={s.stat}>Tiempo      <span style={s.val}>{timeElapsed}s</span></span>}
        </div>
        <p style={s.quote}>"Las palabras no se acaban.<br />Solo cambian de mano."</p>
        <button style={s.btn} onClick={restart}>Volver al menu</button>
      </div>
    );
  }

  return (
    <div style={s.overlay}>
      <span style={s.label}>Transmision interrumpida</span>
      <h1 style={{ ...s.title, color: "#ff4466" }}>Fin de partida</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
        <span style={s.stat}>Oleada alcanzada  <span style={s.val}>{wave}</span></span>
        <span style={s.stat}>WPM               <span style={s.val}>{wpm}</span></span>
        <span style={s.stat}>Precision         <span style={s.val}>{accuracy}%</span></span>
      </div>
      <p style={s.quote}>"Las palabras no se acaban.<br />Solo cambian de mano."</p>
      <button style={s.btn} onClick={restart}>Volver al menu</button>
    </div>
  );
}
