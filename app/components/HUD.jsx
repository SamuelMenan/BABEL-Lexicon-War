import React, { useEffect, useState } from 'react';
import { Bridge } from '../../shared/bridge.js';

const s = {
  hud: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    fontFamily: 'monospace',
  },
  topLeft: {
    position: 'absolute',
    top: '1.5rem',
    left: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  stat: {
    fontSize: '0.85rem',
    color: '#888',
    letterSpacing: '0.1em',
  },
  statValue: {
    color: '#00ffcc',
    fontWeight: 'bold',
  },
  wordTarget: {
    position: 'absolute',
    bottom: '3rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 0,
    fontSize: '2rem',
    letterSpacing: '0.2em',
    textTransform: 'lowercase',
  },
  letterDone:    { color: '#00ff88' },
  letterPending: { color: '#444' },
};

export default function HUD() {
  const [state, setState] = useState(Bridge.getState());

  useEffect(() => Bridge.onStateChange(setState), []);

  const { wpm, accuracy, hp, activeWord } = state;

  return (
    <div style={s.hud}>
      {/* Stats top-left */}
      <div style={s.topLeft}>
        <span style={s.stat}>WPM  <span style={s.statValue}>{wpm}</span></span>
        <span style={s.stat}>ACC  <span style={s.statValue}>{accuracy}%</span></span>
        <span style={s.stat}>HP   <span style={s.statValue}>{hp}</span></span>
      </div>

      {/* Palabra activa — centro inferior */}
      {activeWord && (
        <div style={s.wordTarget}>
          {activeWord.word.split('').map((char, i) => (
            <span
              key={i}
              style={i < activeWord.typed.length ? s.letterDone : s.letterPending}
            >
              {char}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
