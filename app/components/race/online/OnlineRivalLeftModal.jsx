import React, { useEffect } from 'react';
import useTranslation from '../../../../shared/i18n/useTranslation.js';

export default function OnlineRivalLeftModal({ open, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const tTimer = setTimeout(() => onClose?.(), 5000);
    return () => clearTimeout(tTimer);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="online-rival-left" role="dialog" aria-modal="true">
      <div className="online-rival-left__panel">
        <div className="online-rival-left__title">{t('race.hangar.rivalLeftTitle')}</div>
        <div className="online-rival-left__msg">
          {t('race.hangar.rivalLeftMsg')}
        </div>
        <button
          type="button"
          className="online-rival-left__btn"
          onClick={onClose}
          autoFocus
        >{t('race.hangar.rivalLeftReturn')}</button>
        <div className="online-rival-left__hint">{t('race.hangar.rivalLeftAuto')}</div>
      </div>
    </div>
  );
}
