import React from 'react';
import { Bridge } from '../../shared/bridge.js';
import { GAME_MODES } from '../../shared/constants.js';

const styles = {
  container: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2rem',
    background: 'rgba(0,0,8,0.85)',
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '3rem',
    color: '#00ffcc',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '0.9rem',
    color: '#888',
    letterSpacing: '0.2em',
  },
  btn: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '1rem',
    color: '#000',
    background: '#00ffcc',
    border: 'none',
    padding: '0.75rem 2rem',
    cursor: 'pointer',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
};

export default function MainMenu() {
  const start = (mode) => Bridge.commands.startGame(mode);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>BABEL</h1>
      <p style={styles.subtitle}>Guerra Lexica</p>
      <p style={{ ...styles.subtitle, color: '#555', fontStyle: 'italic' }}>
        "Las palabras no se acaban. Solo cambian de mano."
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button style={styles.btn} onClick={() => start(GAME_MODES.COMBAT)}>
          Combate
        </button>
        <button style={{ ...styles.btn, background: '#ff4466', color: '#fff' }}
                onClick={() => start(GAME_MODES.RACING)}>
          Carrera
        </button>
      </div>
    </div>
  );
}
