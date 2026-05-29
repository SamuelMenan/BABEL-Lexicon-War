import React, { useEffect, useRef, useState } from 'react';
import useTranslation from '@shared/i18n/useTranslation.js';
import { playBgm } from '@shared/services/audioManager.js';

export default function EpilepsyWarning({ onAccept, autoSkipAfter = 20 }) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(autoSkipAfter);
  const [canSkip, setCanSkip] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => { playBgm('bgm.warning'); }, []);

  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), 2000);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(skipTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (countdown === 0) onAccept?.();
  }, [countdown, onAccept]);

  useEffect(() => {
    if (canSkip && btnRef.current) btnRef.current.focus();
  }, [canSkip]);

  const handleKeyDown = (e) => {
    if (!canSkip) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAccept?.();
    }
  };

  return (
    <div className="babel-intro" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="babel-bg" aria-hidden="true">
        <div className="babel-bg__orb babel-bg__orb--warning" />
        <div className="babel-bg__orb babel-bg__orb--danger" />
        <div className="babel-bg__grid" />
        <div className="babel-bg__scanlines" />
      </div>

      <header className="babel-frame__header">
        <span>{t('epilepsy.header')}</span>
        <span className="babel-frame__tag--warning">{t('epilepsy.warnTag')}</span>
      </header>

      <main className="babel-intro__main">
        <div className="epilepsy">
          <div className="babel-divider babel-divider--warning" />

          <div className="epilepsy__icon">
            <span className="epilepsy__icon-glyph material-symbols-outlined" aria-hidden="true">warning</span>
          </div>

          <h1 className="epilepsy__title">{t('epilepsy.title')}</h1>
          <p className="epilepsy__subtitle">{t('epilepsy.subtitle')}</p>

          <div className="babel-divider babel-divider--warning" style={{ marginTop: '1.5rem' }} />

          <div className="epilepsy__body">
            <p>{t('epilepsy.body1')}</p>
            <p>{t('epilepsy.body2')}</p>
            <p className="epilepsy__fine">{t('epilepsy.body3')}</p>
          </div>

          <div className="epilepsy__actions">
            <button
              ref={btnRef}
              type="button"
              className="epilepsy__btn"
              onClick={() => canSkip && onAccept?.()}
              disabled={!canSkip}
            >
              {canSkip ? (
                <>
                  <span>{t('epilepsy.accept')}</span>
                  <span className="epilepsy__btn-arrow" aria-hidden="true">→</span>
                </>
              ) : (
                <>
                  <span className="epilepsy__spinner" aria-hidden="true" />
                  <span>{t('epilepsy.loading')}</span>
                </>
              )}
            </button>
            <p className="epilepsy__countdown">
              {t('epilepsy.autoContinue')} <strong>{countdown}s</strong>
            </p>
          </div>
        </div>
      </main>

      <footer className="babel-frame__footer">
        {t('mainMenu.footer')}
      </footer>
    </div>
  );
}
