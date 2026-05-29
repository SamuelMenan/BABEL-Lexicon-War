import React, { useEffect, useState } from 'react';
import useTranslation from '../../shared/i18n/useTranslation.js';
import { playLoopSfx, stopLoopSfx, playSfx } from '../../shared/audioManager.js';

export default function ShipSelectLoadingScreen({ progress = 0 }) {
  const { t } = useTranslation();
  const [cursorOn, setCursorOn]   = useState(true);
  const [msgIdx,   setMsgIdx]     = useState(0);

  const MESSAGES = [
    t('shipSelectLoading.messages.0'),
    t('shipSelectLoading.messages.1'),
    t('shipSelectLoading.messages.2'),
    t('shipSelectLoading.messages.3'),
    t('shipSelectLoading.messages.4'),
  ];

  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 480);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    playLoopSfx('loading.ambient_loop', 0.4);
    return () => {
      stopLoopSfx('loading.ambient_loop');
      playSfx('loading.complete');
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setMsgIdx(v => (v + 1) % MESSAGES.length), 900);
    return () => clearInterval(id);
  }, [MESSAGES.length]);

  const pct    = Math.round(Math.max(0, Math.min(100, progress)));
  const isDone = pct >= 100;

  const pctNumStyle = {
    color:      isDone ? '#00ff88' : '#00ffcc',
    textShadow: isDone ? '0 0 22px #00ff88' : '0 0 14px #00ffcc88',
  };

  return (
    <div className="loading-root">
      <div className="loading-grid" />

      <div className="loading-panel">
        <div className="loading-title">
          <span className="loading-title__main">BABEL</span>
          <span className="loading-title__colon">:</span>
          <span className="loading-title__sub">LEXICON WAR</span>
        </div>

        <div className="loading-hairline" />

        <div className="loading-mode-badge">
          <span className="loading-mode-badge__text">{t('shipSelectLoading.modeBadge')}</span>
        </div>

        <div className="loading-hairline" />

        <div className="loading-message-row">
          <span className="loading-message__diamond">◊</span>
          <span className="loading-message__text">{MESSAGES[msgIdx]}</span>
          <span className="loading-message__cursor" style={{ opacity: cursorOn ? 1 : 0 }}>█</span>
        </div>

        <div className={`loading-bar-track${pct > 0 && !isDone ? ' loading-bar-active' : ''}`}>
          <div className="loading-bar-fill" style={{ width: pct + '%' }}>
            {pct > 2 && pct < 98 && <div className="loading-bar-scan" />}
          </div>
        </div>

        <div className="loading-pct-row">
          <span className="loading-pct__sep">────────────────────────</span>
          <span className="loading-pct__num" style={pctNumStyle}>
            {String(pct).padStart(3, '0')}
          </span>
          <span className="loading-pct__symbol">%</span>
          <span className="loading-pct__sep">────────────────────────</span>
        </div>

        <div className="loading-hairline" />

        <div className="loading-quote">
          <p className="loading-quote__line">{t('loadingScreen.quoteLine1')}</p>
          <p className="loading-quote__line">{t('loadingScreen.quoteLine2')}</p>
          <p className="loading-quote__attr">{t('shipSelectLoading.quoteAttr')}</p>
        </div>
      </div>

      <div className="loading-footer">
        <span className="loading-footer__text">{t('shipSelectLoading.footerProgram')}</span>
        <span className="loading-footer__sep">|</span>
        <span className="loading-footer__text">{t('shipSelectLoading.footerChoose')}</span>
        <span className="loading-footer__sep">|</span>
        <span className="loading-footer__text">KAEL · VOSS</span>
      </div>
    </div>
  );
}
