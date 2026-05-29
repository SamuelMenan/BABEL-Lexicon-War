import React, { useEffect } from 'react';
import { acceptRematch, declineRematch } from '@game/net/online/rematchCoordinator.js';
import { KeybindService } from '@shared/services/keybindService.js';
import Modal from '@app/ui/Modal.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';
import { playSfx } from '@shared/services/audioManager.js';

export default function RematchInviteModal({ invite }) {
  const { t } = useTranslation();

  // SFX: invite al montar (el Modal base maneja open/close sfx)
  useEffect(() => {
    if (!invite) return;
    playSfx('rival.rematch_invite');
  }, [invite]);

  // Modal scope: CONFIRM=accept (CANCEL=decline is handled by Modal onClose). Y/N hotkeys.
  useEffect(() => {
    if (!invite) return;
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => acceptRematch());
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = (e.key || '').toLowerCase();
      if (k === 'y') { e.preventDefault(); acceptRematch(); }
      else if (k === 'n') { e.preventDefault(); declineRematch(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      offConfirm();
      window.removeEventListener('keydown', onKey);
    };
  }, [invite]);

  if (!invite) return null;
  return (
    <Modal
      className="rematch-invite"
      panelClassName="rematch-invite__panel"
      onClose={declineRematch}
    >
      <div className="rematch-invite__title">{t('race.rematch.title')}</div>
      <div className="rematch-invite__msg">
        {t('race.rematch.from', { pilot: (invite.fromPilot || 'rival').toUpperCase() })}
      </div>
      <div className="rematch-invite__actions">
        <button
          type="button"
          className="rematch-invite__btn rematch-invite__btn--accept"
          onClick={() => acceptRematch()}
          autoFocus
        >{t('race.rematch.accept')}</button>
        <button
          type="button"
          className="rematch-invite__btn"
          onClick={() => declineRematch()}
        >{t('race.rematch.decline')}</button>
      </div>
    </Modal>
  );
}
