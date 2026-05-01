import React, { useState } from 'react';
import { Bridge } from '../../shared/bridge.js';
import { GAME_MODES } from '../../shared/constants.js';
import TitleAnimation from './TitleAnimation.jsx';

const styles = {
  container: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    background: 'rgba(0,0,8,0.85)',
  },
  titleImage: {
    maxWidth: '90%',
    width: '600px',
    height: 'auto',
    marginBottom: '0.5rem',
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
  const [showTitleAnimation, setShowTitleAnimation] = useState(true);
  const start = (mode) => Bridge.commands.startGame(mode);

  if (showTitleAnimation) {
    return <TitleAnimation onComplete={() => setShowTitleAnimation(false)} />;
  }

  return (
    <div style={styles.container}>
      <img 
        src="/images/babel-title.png" 
        alt="BABEL: The Lexicon War" 
        style={styles.titleImage}
      />
      <p style={{ ...styles.subtitle, color: '#555', fontStyle: 'italic' }}>
        "Error de sintaxis. Coincidencia fallida."
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
