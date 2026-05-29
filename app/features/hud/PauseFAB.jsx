import React, { useEffect, useState } from 'react';
import { Bridge } from '@shared/state/bridge.js';
import Icon from '@app/ui/Icon.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches
      || 'ontouchstart' in window
      || navigator.maxTouchPoints > 0;
}

export default function PauseFAB() {
  const { t } = useTranslation();
  const [touch] = useState(isTouchDevice);
  const [paused, setPaused] = useState(() => !!Bridge.peekState().isPaused);

  useEffect(() => {
    return Bridge.onStateChange(s => setPaused(!!s.isPaused));
  }, []);

  if (!touch) return null;

  const handle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (paused) Bridge.commands.resumeGame();
    else Bridge.commands.pauseGame();
  };

  return (
    <button
      type="button"
      className={`pause-fab${paused ? ' pause-fab--paused' : ''}`}
      onPointerDown={handle}
      aria-label={paused ? t('pauseMenu.resume') : t('pauseMenu.pause')}
      aria-pressed={paused}
    >
      <span className="pause-fab__icon"><Icon name={paused ? 'play_arrow' : 'pause'} size={22} /></span>
    </button>
  );
}
