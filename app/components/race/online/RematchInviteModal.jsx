import React, { useEffect } from 'react';
import { acceptRematch, declineRematch } from '../../../../game/services/online/rematchCoordinator.js';
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
