import React from 'react';

export default function HangarControls({ autoRotate, onToggleRotate, onConfirm, onCancel, idx, total }) {
  return (
    <div className="hangar-controls">
      <div className="hangar-controls__dots">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`hangar-controls__dot${i === idx ? ' hangar-controls__dot--active' : ''}`}
          />
        ))}
      </div>

      <div className="hangar-controls__btn-row">
        <button className="hangar-controls__btn hangar-controls__btn--secondary" onClick={onToggleRotate}>
          {autoRotate ? 'DETENER · GIRO' : 'INICIAR · GIRO'}
        </button>
        <button className="hangar-controls__btn hangar-controls__btn--danger" onClick={onCancel}>
          VOLVER
        </button>
        <button className="hangar-controls__btn hangar-controls__btn--confirm" onClick={onConfirm}>
          DESPLEGAR · NAVE
        </button>
      </div>

      <p className="hangar-controls__hints">
        ↔ CAMBIAR · R GIRO · ↕ ZOOM · V REESCALAR · ↵ CONFIRMAR
      </p>
    </div>
  );
}
