import React, { useState } from 'react';
import AuthModal from './AuthModal.jsx';
import Modal from '@app/ui/Modal.jsx';
import KeyHint from '@app/ui/KeyHint.jsx';
import KeyboardNavigable from '@app/ui/KeyboardNavigable.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';

export default function GuestPromptModal({ feature = 'default', onClose, onAuthSuccess }) {
  const { t } = useTranslation();
  const [showAuth, setShowAuth] = useState(false);

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

  const actions = [
    { id: 'stay', label: t('auth.guestPrompt.stayGuest'), action: onClose, primary: false },
    { id: 'auth', label: t('auth.guestPrompt.signIn'), action: () => setShowAuth(true), primary: true },
  ];

  return (
    <Modal className="guest-prompt" panelClassName="guest-prompt__panel" onClose={onClose}>
        <div className="guest-prompt__header">
          <span className="guest-prompt__label">◈ {t('auth.guestPrompt.label')}</span>
        </div>
        <h3 className="guest-prompt__title">{t('auth.guestPrompt.title')}</h3>
        <p className="guest-prompt__text">
          {t('auth.guestPrompt.bodyPrefix')} <strong>{t('auth.guestPrompt.guestWord')}</strong>{t('auth.guestPrompt.bodyMiddle')} <strong>{action}</strong> {t('auth.guestPrompt.bodySuffix')}
        </p>
        <KeyboardNavigable
          items={actions}
          orientation="horizontal"
          autoFocus
          initialIndex={1}
          onActivate={(item) => item.action()}
          className="guest-prompt__actions"
        >
          {(item, ctx) => (
            <button
              key={item.id}
              type="button"
              className={`guest-prompt__btn ${item.primary ? 'guest-prompt__btn--primary' : 'guest-prompt__btn--ghost'}${ctx.focused ? ' guest-prompt__btn--focused' : ''}`}
              onClick={item.action}
            >
              {item.label}
            </button>
          )}
        </KeyboardNavigable>
        <KeyHint
          className="guest-prompt__hint"
          items={[
            { key: '←/→', label: t('keys.navigate') },
            { key: '↵', label: t('keys.select') },
            { key: 'ESC', label: t('auth.guestPrompt.closeKey') }
          ]}
        />
    </Modal>
  );
}
