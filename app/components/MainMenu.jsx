import React, { useState } from 'react';
import { Bridge } from '../../shared/bridge.js';
import { GAME_MODES } from '../../shared/constants.js';
import Settings from './Settings.jsx';

export default function MainMenu() {
  const [showSettings, setShowSettings] = useState(false);
  const start = (mode) => Bridge.commands.openShipSelection(mode);

  return showSettings ? <Settings onClose={() => setShowSettings(false)} /> : (
    <div className="main-menu">
      <h1 className="main-menu__title">BABEL:</h1>
      <p className="main-menu__subtitle">Lexicon War</p>
      <p className="main-menu__quote">
        "Error de sintaxis. Coincidencia fallida."
      </p>
      <div className="main-menu__btn-row">
        <button className="main-menu__btn" onClick={() => start(GAME_MODES.COMBAT)}>
          Combate
        </button>
        <button className="main-menu__btn main-menu__btn--race" onClick={() => start(GAME_MODES.RACING)}>
          Carrera
        </button>
      </div>
      <div className="main-menu__secondary-row">
        <button className="main-menu__btn main-menu__btn--ghost" onClick={() => setShowSettings(true)}>
          Configuración
        </button>
      </div>
    </div>
  );
}
