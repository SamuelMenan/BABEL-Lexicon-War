import React from 'react';
import { Bridge } from '../../shared/bridge.js';

const s = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    background: 'rgba(0,0,8,0.92)',
    fontFamily: 'monospace',
  },
  label: {
    fontSize: '0.75rem',
    color: '#555',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: '2.5rem',
    color: '#ff4466',
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
  },
  stat: {
    fontSize: '1rem',
    color: '#888',
    letterSpacing: '0.15em',
  },
  val: {
    color: '#00ffcc',
  },
  quote: {
    fontSize: '0.8rem',
    color: '#444',
    fontStyle: 'italic',
    maxWidth: '380px',
    textAlign: 'center',
    lineHeight: 1.8,
    marginTop: '0.5rem',
  },
  btn: {
    marginTop: '1rem',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: '#000',
    background: '#00ffcc',
    border: 'none',
    padding: '0.65rem 2rem',
    cursor: 'pointer',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
};

export default function MatchResult({ score, wpm, accuracy, wave }) {
  const restart = () => {
    Bridge.setState({ gameOver: false, isRunning: false, hp: 100, score: 0, wave: 0 });
  };

  return (
    <div style={s.overlay}>
      <span style={s.label}>Transmisión interrumpida</span>
      <h1 style={s.title}>Game Over</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <span style={s.stat}>Oleada alcanzada  <span style={s.val}>{wave}</span></span>
        <span style={s.stat}>WPM               <span style={s.val}>{wpm}</span></span>
        <span style={s.stat}>Precisión         <span style={s.val}>{accuracy}%</span></span>
      </div>

      <p style={s.quote}>
        "Las palabras no se acaban.<br />Solo cambian de mano."
      </p>

      <button style={s.btn} onClick={restart}>
        Volver al menú
      </button>
    </div>
  );
}
