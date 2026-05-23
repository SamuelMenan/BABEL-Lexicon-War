import React, { useEffect } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES');
function fmt(n) { return NUMBER_FORMATTER.format(n ?? 0); }

export default function PurchaseModal({ ship, grafemas, onConfirm, onCancel }) {
  // Modal scope push/pop + CONFIRM/CANCEL via service.
  useEffect(() => {
    KeybindService.pushScope('modal');
    const offCancel  = KeybindService.register('modal', 'CANCEL',  () => onCancel());
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => onConfirm());
    return () => { offCancel(); offConfirm(); KeybindService.popScope('modal'); };
  }, [onConfirm, onCancel]);

  const after = Math.max(0, (grafemas ?? 0) - (ship.price ?? 0));

  return (
    <div
      className="purchase-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-modal-title"
      onClick={onCancel}
    >
      <div
        className="purchase-modal__panel"
        role="document"
        onClick={(e) => e.stopPropagation()}
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
          <button className="purchase-modal__btn purchase-modal__btn--confirm" onClick={onConfirm} autoFocus>
            Confirmar Compra
          </button>
        </div>

        <p className="purchase-modal__hint">↵ Confirmar · ESC Cancelar</p>
      </div>
    </div>
  );
}
