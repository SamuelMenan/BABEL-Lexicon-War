import React, { useEffect } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import KeyHint from '../common/KeyHint.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';
import { getNumberFormatter } from '../../../shared/i18n/index.js';

export default function PurchaseModal({ ship, grafemas, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const formatter = getNumberFormatter();

  const fmt = (n) => formatter.format(n ?? 0);

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
          <span className="purchase-modal__label">{t('hangar.purchase.title')}</span>
        </div>

        <h3 id="purchase-modal-title" className="purchase-modal__ship">{ship.name.toUpperCase()}</h3>
        <span className="purchase-modal__code">CORE · {ship.code}</span>

        <div className="purchase-modal__rows">
          <div className="purchase-modal__row">
            <span>{t('hangar.purchase.currentBalance')}</span>
            <span>₲ {fmt(grafemas)}</span>
          </div>
          <div className="purchase-modal__row purchase-modal__row--cost">
            <span>{t('hangar.purchase.cost')}</span>
            <span>− ₲ {fmt(ship.price)}</span>
          </div>
          <div className="purchase-modal__row purchase-modal__row--total">
            <span>{t('hangar.purchase.remainingBalance')}</span>
            <span>₲ {fmt(after)}</span>
          </div>
        </div>

        <div className="purchase-modal__actions">
          <button className="purchase-modal__btn purchase-modal__btn--cancel" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className="purchase-modal__btn purchase-modal__btn--confirm" onClick={onConfirm} autoFocus>
            {t('hangar.purchase.confirmBtn')}
          </button>
        </div>

        <KeyHint
          className="purchase-modal__hint"
          items={[
            { key: '↵',   label: t('common.confirm').toLowerCase() },
            { key: 'ESC', label: t('common.cancel').toLowerCase() },
          ]}
        />
      </div>
    </div>
  );
}
