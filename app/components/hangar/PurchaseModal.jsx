import React, { useEffect } from 'react';

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES');
function fmt(n) { return NUMBER_FORMATTER.format(n ?? 0); }

export default function PurchaseModal({ ship, grafemas, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      if (e.key === 'Enter')  { e.stopPropagation(); onConfirm(); }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [onConfirm, onCancel]);

  const after = Math.max(0, (grafemas ?? 0) - (ship.price ?? 0));

  return (
    <div
      className="purchase-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-modal-title"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      tabIndex={-1}
    >
      <div
        className="purchase-modal__panel"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="purchase-modal__header">
          <span className="purchase-modal__label">◈ CONFIRMAR ADQUISICIÓN</span>
        </div>

        <h3 id="purchase-modal-title" className="purchase-modal__ship">{ship.name.toUpperCase()}</h3>
        <span className="purchase-modal__code">CORE · {ship.code}</span>

        <div className="purchase-modal__rows">
          <div className="purchase-modal__row">
            <span>Saldo actual</span>
            <span>₲ {fmt(grafemas)}</span>
          </div>
          <div className="purchase-modal__row purchase-modal__row--cost">
            <span>Coste</span>
            <span>− ₲ {fmt(ship.price)}</span>
          </div>
          <div className="purchase-modal__row purchase-modal__row--total">
            <span>Saldo posterior</span>
            <span>₲ {fmt(after)}</span>
          </div>
        </div>

        <div className="purchase-modal__actions">
          <button className="purchase-modal__btn purchase-modal__btn--cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="purchase-modal__btn purchase-modal__btn--confirm" onClick={onConfirm}>
            Confirmar Compra
          </button>
        </div>

        <p className="purchase-modal__hint">↵ Confirmar · ESC Cancelar</p>
      </div>
    </div>
  );
}
