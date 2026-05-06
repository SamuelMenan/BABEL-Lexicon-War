import React, { useEffect, useRef, useState } from "react";
import { Bridge } from "../../shared/bridge.js";
import Settings from "./Settings.jsx";

export default function PauseMenu() {
  const [showSettings, setShowSettings] = useState(false);
  const resumeRef = useRef(null);

  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  const resume  = () => Bridge.commands.resumeGame();
  const toMenu  = () => window.location.reload();

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="pause-menu">
      <div className="pause-menu__panel">
        <span className="pause-menu__scan" aria-hidden="true" />

        <div className="pause-menu__header">
          <span className="pause-menu__header-label">◈ SISTEMA EN PAUSA</span>
        </div>

        <h2 className="pause-menu__title">Pausa</h2>

        <div className="pause-menu__actions">
          <button
            ref={resumeRef}
            className="pause-menu__btn pause-menu__btn--primary"
            onClick={resume}
          >
            <span className="pause-menu__btn-icon">▶</span>
            Reanudar
          </button>

          <button
            className="pause-menu__btn pause-menu__btn--secondary"
            onClick={() => setShowSettings(true)}
          >
            Configuración
          </button>

          <button
            className="pause-menu__btn pause-menu__btn--ghost"
            onClick={toMenu}
          >
            Volver al Menú Principal
          </button>
        </div>

        <span className="pause-menu__hint">[ESC] para reanudar</span>
      </div>
    </div>
  );
}
