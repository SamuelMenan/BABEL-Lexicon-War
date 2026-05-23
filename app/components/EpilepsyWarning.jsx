import React, { useEffect, useRef, useState } from 'react';

export default function EpilepsyWarning({ onAccept, autoSkipAfter = 10 }) {
  const [countdown, setCountdown] = useState(autoSkipAfter);
  const [canSkip, setCanSkip] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), 2000);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(skipTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (countdown === 0) onAccept?.();
  }, [countdown, onAccept]);

  useEffect(() => {
    if (canSkip && btnRef.current) btnRef.current.focus();
  }, [canSkip]);

  const handleKeyDown = (e) => {
    if (!canSkip) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAccept?.();
    }
  };

  return (
    <div className="babel-intro" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="babel-bg" aria-hidden="true">
        <div className="babel-bg__orb babel-bg__orb--warning" />
        <div className="babel-bg__orb babel-bg__orb--danger" />
        <div className="babel-bg__grid" />
        <div className="babel-bg__scanlines" />
      </div>

      <header className="babel-frame__header">
        <span>BABEL · PROTOCOLO DE SEGURIDAD</span>
        <span className="babel-frame__tag--warning">// WARN-001</span>
      </header>

      <main className="babel-intro__main">
        <div className="epilepsy">
          <div className="babel-divider babel-divider--warning" />

          <div className="epilepsy__icon">
            <span className="epilepsy__icon-glyph" aria-hidden="true">⚠</span>
          </div>

          <h1 className="epilepsy__title">Advertencia</h1>
          <p className="epilepsy__subtitle">Fotosensibilidad</p>

          <div className="babel-divider babel-divider--warning" style={{ marginTop: '1.5rem' }} />

          <div className="epilepsy__body">
            <p>
              Este juego contiene efectos visuales que pueden incluir patrones
              de luz intermitente y destellos que podrían provocar convulsiones
              en personas con epilepsia fotosensible.
            </p>
            <p>
              Si usted o alguien de su familia tiene antecedentes de epilepsia,
              consulte a un médico antes de jugar.
            </p>
            <p className="epilepsy__fine">
              Si experimenta mareos, alteración de la visión, contracciones
              musculares, desorientación o cualquier tipo de movimiento
              involuntario, deje de jugar inmediatamente.
            </p>
          </div>

          <div className="epilepsy__actions">
            <button
              ref={btnRef}
              type="button"
              className="epilepsy__btn"
              onClick={() => canSkip && onAccept?.()}
              disabled={!canSkip}
            >
              {canSkip ? (
                <>
                  <span>Entiendo y acepto continuar</span>
                  <span className="epilepsy__btn-arrow" aria-hidden="true">→</span>
                </>
              ) : (
                <>
                  <span className="epilepsy__spinner" aria-hidden="true" />
                  <span>Leyendo...</span>
                </>
              )}
            </button>
            <p className="epilepsy__countdown">
              Continúa automáticamente en <strong>{countdown}s</strong>
            </p>
          </div>
        </div>
      </main>

      <footer className="babel-frame__footer">
        PROGRAMA TYPO · BABEL: LEXICON WAR · v1.0.0
      </footer>
    </div>
  );
}
