import React, { useEffect, useState } from 'react';
import { Bridge } from '../../../shared/bridge.js';
import { toggleBot } from '../../../game/systems/AutoTyper.js';

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches
      || 'ontouchstart' in window
      || navigator.maxTouchPoints > 0;
}

export default function BotToggleFAB() {
  const [touch] = useState(isTouchDevice);
  const [active, setActive] = useState(() => !!Bridge.peekState().botActive);

  useEffect(() => {
    return Bridge.onStateChange(s => setActive(!!s.botActive));
  }, []);

  if (!touch) return null;

  const handle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBot();
  };

  return (
    <button
      type="button"
      className={`bot-fab${active ? ' bot-fab--on' : ''}`}
      onPointerDown={handle}
      aria-label={active ? 'Detener bot' : 'Activar bot'}
      aria-pressed={active}
    >
      <span className="bot-fab__icon">{active ? '■' : '▶'}</span>
      <span className="bot-fab__label">BOT</span>
    </button>
  );
}
