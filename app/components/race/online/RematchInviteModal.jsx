import React, { useEffect } from 'react';
import { acceptRematch, declineRematch } from '../../../../game/services/online/rematchCoordinator.js';
import { KeybindService } from '../../../../shared/keybindService.js';
import useTranslation from '../../../../shared/i18n/useTranslation.js';
import { playSfx } from '../../../../shared/audioManager.js';

export default function RematchInviteModal({ invite }) {
  const { t } = useTranslation();
  // SFX: invite + modal.open al montar; modal.close al desmontar.
  useEffect(() => {
    if (!invite) return;
    playSfx('rival.rematch_invite');
    playSfx('modal.open');
    return () => playSfx('modal.close');
  }, [!!invite]);

  // Modal scope: CONFIRM=accept, CANCEL=decline. Y/N hotkeys.
  useEffect(() => {
    if (!invite) return;
    KeybindService.pushScope('modal');
    const offCancel  = KeybindService.register('modal', 'CANCEL',  () => declineRematch());
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => acceptRematch());
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = (e.key || '').toLowerCase();
      if (k === 'y') { e.preventDefault(); acceptRematch(); }
      else if (k === 'n') { e.preventDefault(); declineRematch(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      offCancel(); offConfirm();
      KeybindService.popScope('modal');
      window.removeEventListener('keydown', onKey);
    };
  }, [!!invite]);

  if (!invite) return null;
  return (
    <div className="rematch-invite" role="dialog" aria-modal="true">
      <div className="rematch-invite__panel">
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
      </div>
    </div>
  );
}
