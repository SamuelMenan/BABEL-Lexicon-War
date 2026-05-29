import React, { useEffect } from 'react';
import { KeybindService } from '@shared/services/keybindService.js';
import Modal from '@app/ui/Modal.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';

export default function OnlineRivalLeftModal({ open, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const tTimer = setTimeout(() => onClose?.(), 5000);
    return () => clearTimeout(tTimer);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => onClose?.());
    return () => { offConfirm(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <Modal
      className="online-rival-left"
      panelClassName="online-rival-left__panel"
      onClose={onClose}
    >
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
    </Modal>
  );
}
