import React, { useEffect, useState } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import AuthModal from './AuthModal.jsx';
import KeyHint from '../common/KeyHint.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';

export default function GuestPromptModal({ feature = 'default', onClose, onAuthSuccess }) {
  const { t } = useTranslation();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    KeybindService.pushScope('modal');
    const off = KeybindService.register('modal', 'CANCEL', () => onClose?.());
    return () => { off(); KeybindService.popScope('modal'); };
  }, [onClose]);

  if (showAuth) {
    return (
      <AuthModal
        initialMode="signin"
        onClose={() => setShowAuth(false)}
        onSuccess={(user) => { onAuthSuccess?.(user); onClose?.(); }}
      />
    );
  }

  const FEATURE_COPY = {
    purchase:    t('auth.guestPrompt.features.purchase'),
    leaderboard: t('auth.guestPrompt.features.leaderboard'),
    combat:      t('auth.guestPrompt.features.combat'),
    racing:      t('auth.guestPrompt.features.racing'),
    default:     t('auth.guestPrompt.features.default'),
  };

  const action = FEATURE_COPY[feature] || FEATURE_COPY.default;

  return (
    <div className="guest-prompt" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="guest-prompt__panel" onClick={(e) => e.stopPropagation()}>
        <div className="guest-prompt__header">
          <span className="guest-prompt__label">◈ {t('auth.guestPrompt.label')}</span>
        </div>
        <h3 className="guest-prompt__title">{t('auth.guestPrompt.title')}</h3>
        <p className="guest-prompt__text">
          {t('auth.guestPrompt.bodyPrefix')} <strong>{t('auth.guestPrompt.guestWord')}</strong>{t('auth.guestPrompt.bodyMiddle')} <strong>{action}</strong> {t('auth.guestPrompt.bodySuffix')}
        </p>
        <div className="guest-prompt__actions">
          <button type="button" className="guest-prompt__btn guest-prompt__btn--ghost" onClick={onClose}>
            {t('auth.guestPrompt.stayGuest')}
          </button>
          <button type="button" className="guest-prompt__btn guest-prompt__btn--primary" onClick={() => setShowAuth(true)}>
            {t('auth.guestPrompt.signIn')}
          </button>
        </div>
        <KeyHint
          className="guest-prompt__hint"
          items={[{ key: 'ESC', label: t('auth.guestPrompt.closeKey') }]}
        />
      </div>
    </div>
  );
}
