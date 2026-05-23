import React, { useState } from 'react';
import { Bridge } from '../../shared/bridge.js';
import { GAME_MODES } from '../../shared/constants.js';
import Settings from './Settings.jsx';
import KeyboardNavigable from './common/KeyboardNavigable.jsx';

export default function MainMenu() {
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) return <Settings onClose={() => setShowSettings(false)} />;

  // Defer scope-changing commands un tick para que el Enter actual termine
  // antes de cambiar a scope 'hangar'. Sin esto, el mismo Enter dispara
  // KbNav activate (menu) + KeybindService CONFIRM (hangar) en cascada.
  const deferred = (fn) => () => setTimeout(fn, 0);

  const items = [
    {
      id: 'combat',
      label: 'Modo Combate',
      desc: 'Enfrenta al Enjambre. Escribe para destruir.',
      glyph: '◢',
      accent: 'var(--col-danger)',
      action: deferred(() => Bridge.commands.openShipSelection(GAME_MODES.COMBAT)),
    },
    {
      id: 'racing',
      label: 'Modo Carrera',
      desc: 'Velocidad pura. Tu WPM determina la nave.',
      glyph: '▶',
      accent: 'var(--col-primary)',
      action: deferred(() => Bridge.commands.openShipSelection(GAME_MODES.RACING)),
    },
    {
      id: 'settings',
      label: 'Configuración',
      desc: 'Controles, audio, visuales y atajos.',
      glyph: '⚙',
      accent: 'var(--text-dim)',
      action: () => setShowSettings(true),
    },
  ];

  return (
    <div className="main-menu">
      {/* Background system unificado */}
      <div className="babel-bg" aria-hidden="true">
        <div className="babel-bg__orb babel-bg__orb--primary" />
        <div className="babel-bg__orb babel-bg__orb--danger" />
        <div className="babel-bg__grid" />
        <div className="babel-bg__scanlines" />
      </div>

      {/* Header */}
      <header className="babel-frame__header">
        <span>BABEL · LEXICON WAR</span>
        <span className="babel-frame__tag--accent">// PROGRAMA TYPO</span>
      </header>

      {/* Main */}
      <main className="main-menu__main">
        <div className="main-menu__title-block">
          <div className="babel-divider" />
          <h1 className="main-menu__title" data-text="BABEL">BABEL</h1>
          <p className="main-menu__subtitle" data-text="The Lexicon War">The Lexicon War</p>
          <div className="babel-divider" />
          <p className="main-menu__quote">
            &quot;Error de sintaxis. Coincidencia fallida.&quot;
          </p>
        </div>

        <KeyboardNavigable
          items={items}
          orientation="vertical"
          onActivate={(it) => it.action()}
          initialIndex={0}
        >
          {(it, { focused, activate }) => (
            <button
              key={it.id}
              className={`main-menu__btn${focused ? ' main-menu__btn--focused' : ''}`}
              style={{ '--btn-accent': it.accent }}
              onClick={activate}
              onMouseEnter={(e) => e.currentTarget.focus()}
            >
              <span className="main-menu__btn-icon" aria-hidden="true">{it.glyph}</span>
              <span className="main-menu__btn-body">
                <span className="main-menu__btn-label">{it.label}</span>
                <span className="main-menu__btn-desc">{it.desc}</span>
              </span>
              <span className="main-menu__btn-arrow" aria-hidden="true">→</span>
            </button>
          )}
        </KeyboardNavigable>

        <p className="main-menu__hint">↑↓ navegar · Enter elegir · 1–3 atajo · ? atajos</p>
      </main>

      {/* Footer */}
      <footer className="babel-frame__footer">
        PROGRAMA TYPO · BABEL: LEXICON WAR · v1.0.0
      </footer>
    </div>
  );
}
