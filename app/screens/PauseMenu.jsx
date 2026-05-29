import React, { useState, useEffect, useRef, useMemo } from "react";
import { Bridge } from "@shared/state/bridge.js";
import Settings from "../features/settings/Settings.jsx";
import KeyHint from "../ui/KeyHint.jsx";
import useTranslation from "@shared/i18n/useTranslation.js";
import { KeybindService } from "@shared/services/keybindService.js";

export default function PauseMenu() {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);

  const { gameMode } = Bridge.peekState();
  const isGameplay = gameMode === 'combat' || gameMode === 'racing';

  const items = useMemo(() => [
    { id: 'resume',   label: t('pauseMenu.resume'),              icon: '▶', variant: 'primary',
      action: () => Bridge.commands.resumeGame() },
    { id: 'settings', label: t('pauseMenu.settings'),         variant: 'secondary',
      action: () => setShowSettings(true) },
    ...(isGameplay ? [{
      id: 'hangar',
      label: t('pauseMenu.toHangar'),
      variant: 'secondary',
      action: () => Bridge.commands.exitToHangar(),
    }] : []),
    { id: 'menu',     label: t('pauseMenu.toMenu'), variant: 'ghost',
      action: () => Bridge.commands.exitToMenu() },
  ], [isGameplay, t]);

  const focusIdxRef = useRef(focusIdx);
  useEffect(() => {
    focusIdxRef.current = focusIdx;
  }, [focusIdx]);

  useEffect(() => {
    if (showSettings) return;

    const offs = [
      KeybindService.register('menu', 'NAV_UP', () => {
        setFocusIdx(curr => (curr - 1 + items.length) % items.length);
      }),
      KeybindService.register('menu', 'NAV_DOWN', () => {
        setFocusIdx(curr => (curr + 1) % items.length);
      }),
      KeybindService.register('menu', 'CONFIRM', () => {
        items[focusIdxRef.current]?.action();
      }),
      KeybindService.register('menu', 'CANCEL', () => {
        Bridge.commands.resumeGame();
      })
    ];
    return () => offs.forEach(fn => fn());
  }, [items, showSettings]);

  if (showSettings) return <Settings onClose={() => setShowSettings(false)} />;

  return (
    <div className="pause-menu">
      <div className="pause-menu__panel">
        <span className="pause-menu__scan" aria-hidden="true" />
        <div className="pause-menu__header">
          <span className="pause-menu__header-label">◈ {t('pauseMenu.header')}</span>
        </div>
        <h2 className="pause-menu__title">{t('pauseMenu.title')}</h2>

        <div className="pause-menu__actions">
          {items.map((it, idx) => {
            const focused = idx === focusIdx;
            return (
              <button
                key={it.id}
                type="button"
                className={
                  `pause-menu__btn pause-menu__btn--${it.variant}` +
                  (focused ? ' pause-menu__btn--focused' : '')
                }
                onClick={it.action}
                onMouseEnter={() => setFocusIdx(idx)}
              >
                {it.icon && <span className="pause-menu__btn-icon">{it.icon}</span>}
                {it.label}
              </button>
            );
          })}
        </div>

        <KeyHint
          className="pause-menu__hint"
          items={[
            { key: '↑↓',    label: t('keys.navigate') },
            { key: 'Enter', label: t('keys.select') },
            { key: 'ESC',   label: t('keys.resume') },
          ]}
        />
      </div>
    </div>
  );
}
