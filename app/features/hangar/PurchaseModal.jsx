import React, { useEffect } from 'react';
import { KeybindService } from '@shared/services/keybindService.js';
import KeyHint from '@app/ui/KeyHint.jsx';
import Modal from '@app/ui/Modal.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';
import { getNumberFormatter } from '@shared/i18n/index.js';

export default function PurchaseModal({ ship, grafemas, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const formatter = getNumberFormatter();

  const fmt = (n) => formatter.format(n ?? 0);

  const canAfford = (grafemas ?? 0) >= (ship.price ?? 0);

  // Modal CONFIRM via service (CANCEL is handled by Modal onClose).
  useEffect(() => {
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => { if (canAfford) onConfirm(); });
    return () => { offConfirm(); };
  }, [onConfirm, canAfford]);

  const after = Math.max(0, (grafemas ?? 0) - (ship.price ?? 0));

  return (
    <Modal
      className="purchase-modal"
      panelClassName="purchase-modal__panel"
      onClose={onCancel}
      labelledBy="purchase-modal-title"
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
        <button type="button" className="purchase-modal__btn purchase-modal__btn--cancel" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="button" className="purchase-modal__btn purchase-modal__btn--confirm" onClick={onConfirm} disabled={!canAfford} autoFocus>
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
    </Modal>
  );
}
