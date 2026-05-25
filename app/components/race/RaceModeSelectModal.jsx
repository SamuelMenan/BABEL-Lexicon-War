import React from 'react';
import KeyboardNavigable from '../common/KeyboardNavigable.jsx';
import Icon from '../common/Icon.jsx';
import { isSupabaseConfigured } from '../../../game/services/supabase/client.js';
import useTranslation from '../../../shared/i18n/useTranslation.js';

// Modal mostrado al presionar "Carrera" en MainMenu: Single vs Online.
export default function RaceModeSelectModal({ onSelectSingle, onSelectOnline, onClose }) {
  const { t } = useTranslation();
  const onlineAvailable = isSupabaseConfigured;

  const items = [
    { id: 'single', label: t('race.modeSelect.single'),  desc: t('race.modeSelect.singleDesc'), action: onSelectSingle, accent: 'var(--col-primary)' },
    { id: 'online', label: t('race.modeSelect.online'),  desc: onlineAvailable ? t('race.modeSelect.onlineDesc') : t('race.modeSelect.onlineUnavailable'), action: onlineAvailable ? onSelectOnline : null, accent: 'var(--col-active)', disabled: !onlineAvailable },
    { id: 'back',   label: t('common.back'),             desc: t('race.modeSelectExtra.backDesc'), action: onClose, accent: 'var(--text-dim)' },
  ];

  return (
    <div className="race-mode-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="race-mode-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="race-mode-modal__header">
          <span className="race-mode-modal__label">◈ {t('race.modeSelect.label')}</span>
          <button type="button" className="race-mode-modal__close" onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={16} /></button>
        </header>
        <h2 className="race-mode-modal__title">{t('race.modeSelect.title')}</h2>
        <KeyboardNavigable
          items={items.filter(it => !it.disabled || it.id === 'back')}
          orientation="vertical"
          onActivate={(it) => it.action?.()}
          initialIndex={0}
          className="race-mode-modal__list"
        >
          {(it, { focused, activate }) => (
            <button
              key={it.id}
              type="button"
              className={`race-mode-modal__btn${focused ? ' race-mode-modal__btn--focused' : ''}${it.disabled ? ' race-mode-modal__btn--disabled' : ''}`}
              style={{ '--btn-accent': it.accent }}
              onClick={activate}
              onMouseEnter={(e) => e.currentTarget.focus()}
              disabled={it.disabled}
            >
              <span className="race-mode-modal__btn-label">{it.label}</span>
              <span className="race-mode-modal__btn-desc">{it.desc}</span>
            </button>
          )}
        </KeyboardNavigable>
        {!onlineAvailable && (
          <p className="race-mode-modal__hint"><Icon name="warning" size={14} /> {t('race.modeSelect.supabaseWarn')}</p>
        )}
      </div>
    </div>
  );
}
