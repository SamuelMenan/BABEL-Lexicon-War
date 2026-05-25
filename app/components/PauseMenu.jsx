import React, { useState } from "react";
import { Bridge } from "../../shared/bridge.js";
import Settings from "./Settings.jsx";
import KeyboardNavigable from "./common/KeyboardNavigable.jsx";
import KeyHint from "./common/KeyHint.jsx";
import useTranslation from "../../shared/i18n/useTranslation.js";

export default function PauseMenu() {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) return <Settings onClose={() => setShowSettings(false)} />;

  const { gameMode } = Bridge.peekState();
  const isGameplay = gameMode === 'combat' || gameMode === 'racing';

  const items = [
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
  ];

  return (
    <div className="pause-menu">
      <div className="pause-menu__panel">
        <span className="pause-menu__scan" aria-hidden="true" />
        <div className="pause-menu__header">
          <span className="pause-menu__header-label">◈ {t('pauseMenu.header')}</span>
        </div>
        <h2 className="pause-menu__title">{t('pauseMenu.title')}</h2>

        <KeyboardNavigable
          items={items}
          orientation="vertical"
          onActivate={(it) => it.action()}
          initialIndex={0}
          className="pause-menu__actions"
        >
          {(it, { focused, activate }) => (
            <button
              key={it.id}
              className={
                `pause-menu__btn pause-menu__btn--${it.variant}` +
                (focused ? ' pause-menu__btn--focused' : '')
              }
              onClick={activate}
              onMouseEnter={(e) => e.currentTarget.focus()}
            >
              {it.icon && <span className="pause-menu__btn-icon">{it.icon}</span>}
              {it.label}
            </button>
          )}
        </KeyboardNavigable>

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
