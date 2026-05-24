import React, { useState } from "react";
import { Bridge } from "../../shared/bridge.js";
import Settings from "./Settings.jsx";
import KeyboardNavigable from "./common/KeyboardNavigable.jsx";

export default function PauseMenu() {
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) return <Settings onClose={() => setShowSettings(false)} />;

  const { gameMode } = Bridge.peekState();
  const isGameplay = gameMode === 'combat' || gameMode === 'racing';

  const items = [
    { id: 'resume',   label: 'Reanudar',              icon: '▶', variant: 'primary',
      action: () => Bridge.commands.resumeGame() },
    { id: 'settings', label: 'Configuracion',         variant: 'secondary',
      action: () => setShowSettings(true) },
    ...(isGameplay ? [{
      id: 'hangar',
      label: 'Volver al Hangar',
      variant: 'secondary',
      action: () => Bridge.commands.exitToHangar(),
    }] : []),
    { id: 'menu',     label: 'Volver al Menu Principal', variant: 'ghost',
      action: () => Bridge.commands.exitToMenu() },
  ];

  return (
    <div className="pause-menu">
      <div className="pause-menu__panel">
        <span className="pause-menu__scan" aria-hidden="true" />
        <div className="pause-menu__header">
          <span className="pause-menu__header-label">◈ SISTEMA EN PAUSA</span>
        </div>
        <h2 className="pause-menu__title">Pausa</h2>

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

        <span className="pause-menu__hint">↑↓ navegar · Enter elegir · ESC reanudar</span>
      </div>
    </div>
  );
}
