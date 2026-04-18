import React, { useState } from 'react';
import { Bridge } from '../../shared/bridge.js';
import { GAME_MODES, DIFFICULTY_LEVELS } from '../../shared/constants.js';

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
    fontFamily: 'monospace',
    fontSize: '3rem',
    color: '#00ffcc',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: '#888',
    letterSpacing: '0.2em',
  },
  btn: {
    fontFamily: 'monospace',
    fontSize: '1rem',
    color: '#000',
    background: '#00ffcc',
    border: 'none',
    padding: '0.75rem 2rem',
    cursor: 'pointer',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  difficultyWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'center',
  },
  difficultyLabel: {
    fontFamily: 'monospace',
    fontSize: '0.62rem',
    color: '#667',
    letterSpacing: '0.26em',
    textTransform: 'uppercase',
  },
  difficultyRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  difficultyBtn: {
    fontFamily: 'monospace',
    fontSize: '0.72rem',
    color: '#9ab',
    background: 'rgba(0, 255, 204, 0.08)',
    border: '1px solid #1f3741',
    padding: '0.4rem 0.7rem',
    cursor: 'pointer',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  difficultyBtnActive: {
    color: '#001018',
    background: '#00ffcc',
    border: '1px solid #00ffcc',
    boxShadow: '0 0 10px rgba(0,255,204,0.45)',
  },
  helperText: {
    fontFamily: 'monospace',
    fontSize: '0.64rem',
    color: '#5b6670',
    letterSpacing: '0.05em',
    maxWidth: '540px',
    textAlign: 'center',
    lineHeight: 1.45,
  },
};

const DIFFICULTY_META = {
  [DIFFICULTY_LEVELS.EASY]: 'Facil: si fallas, solo corriges la letra equivocada.',
  [DIFFICULTY_LEVELS.MEDIUM]: 'Medio: al fallar retrocedes una letra.',
  [DIFFICULTY_LEVELS.HARD]: 'Dificil: al fallar reinicias toda la palabra.',
};

export default function MainMenu() {
  const [difficulty, setDifficulty] = useState(DIFFICULTY_LEVELS.MEDIUM);
  const start = (mode) => Bridge.commands.startGame(mode, difficulty);

  const difficultyOptions = [
    { key: DIFFICULTY_LEVELS.EASY, label: 'Facil' },
    { key: DIFFICULTY_LEVELS.MEDIUM, label: 'Medio' },
    { key: DIFFICULTY_LEVELS.HARD, label: 'Dificil' },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>BABEL</h1>
      <p style={styles.subtitle}>Lexicon War</p>
      <p style={{ ...styles.subtitle, color: '#555', fontStyle: 'italic' }}>
        "Las palabras no se acaban. Solo cambian de mano."
      </p>
      <div style={styles.difficultyWrap}>
        <span style={styles.difficultyLabel}>Dificultad</span>
        <div style={styles.difficultyRow}>
          {difficultyOptions.map(({ key, label }) => {
            const active = key === difficulty;
            return (
              <button
                key={key}
                style={{
                  ...styles.difficultyBtn,
                  ...(active ? styles.difficultyBtnActive : {}),
                }}
                onClick={() => setDifficulty(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p style={styles.helperText}>{DIFFICULTY_META[difficulty]}</p>
      </div>
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
