import React from 'react';
import KeyHint from '../common/KeyHint.jsx';
import Icon from '../common/Icon.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';
import { getNumberFormatter } from '../../../shared/i18n/index.js';

export default function HangarControls({
  onConfirm, onCancel,
  onPurchase, onEquip,
  onOpenCharSelect, character,
  idx, total,
  owned, equipped, canBuy, price, missing,
  isGuest = false,
}) {
  const { t } = useTranslation();
  const formatter = getNumberFormatter();

  const formatN = (n) => formatter.format(n ?? 0);

  let actionBtn;
  if (!owned) {
    // Guest: clickeable (abre prompt). Resto: gated por canBuy.
    const tooltip = isGuest
      ? t('hangar.buyLocked')
      : (canBuy ? '' : t('hangar.buyMissing', { amount: formatN(missing) }));
    const enabled = isGuest || canBuy;
    actionBtn = (
      <button
        className={`hangar-controls__btn hangar-controls__btn--buy${enabled ? '' : ' hangar-controls__btn--disabled'}`}
        onClick={enabled ? onPurchase : undefined}
        disabled={!enabled}
        title={tooltip}
      >
        {isGuest ? (<>{t('hangar.buy')} · <Icon name="lock" size={14} /></>) : `${t('hangar.buy')} · ₲ ${formatN(price)}`}
      </button>
    );
  } else if (!equipped) {
    actionBtn = (
      <button className="hangar-controls__btn hangar-controls__btn--equip" onClick={onEquip}>
        {t('hangar.equip')}
      </button>
    );
  } else {
    actionBtn = (
      <button className="hangar-controls__btn hangar-controls__btn--confirm" onClick={onConfirm}>
        {t('hangar.deploy')}
      </button>
    );
  }

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
        {onOpenCharSelect && (
          <button
            className="hangar-controls__btn hangar-controls__btn--secondary"
            onClick={onOpenCharSelect}
            title={t('hangar.pilotSelectTooltip')}
          >
            {t('hangar.pilot')} · {(character?.name || '—').toUpperCase()}
          </button>
        )}
        <button className="hangar-controls__btn hangar-controls__btn--danger" onClick={onCancel}>
          {t('hangar.back')}
        </button>
        {actionBtn}
      </div>

      <KeyHint
        className="hangar-controls__hints"
        items={[
          { key: '←/→',  label: t('keys.ship') },
          { key: 'WASD', label: t('keys.rotate') },
          { key: 'C',    label: t('keys.views') },
          { key: 'R',    label: t('keys.reset') },
          { key: 'K',    label: t('keys.fire') },
          { key: 'L',    label: t('keys.laser') },
          { key: 'J',    label: t('keys.boosters') },
          { key: 'X',    label: t('keys.detonate') },
          { key: 'ESC',  label: t('keys.exit') },
          { key: '↵',    label: owned ? (equipped ? t('hangar.deploy').toLowerCase() : t('hangar.equip').toLowerCase()) : t('hangar.buy').toLowerCase() },
          { key: '?',    label: t('keys.shortcuts') },
        ]}
      />
    </div>
  );
}
