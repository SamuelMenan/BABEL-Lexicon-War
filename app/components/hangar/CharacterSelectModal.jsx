import React, { useEffect, useState } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import { listCharacters } from '../../../shared/characterData.js';
import KeyHint from '../common/KeyHint.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';
import { playSfx } from '../../../shared/audioManager.js';

export default function CharacterSelectModal({ currentId, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const CHARACTERS = listCharacters();
  // Sin foco al abrir. Visual temporal solo tras click. Badge ACTIVO persiste por currentId.
  const [focusIdx, setFocusIdx] = useState(-1);

  useEffect(() => {
    KeybindService.pushScope('modal');
    const offCancel  = KeybindService.register('modal', 'CANCEL',  () => onCancel());
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => {
      if (focusIdx < 0) return;
      onConfirm(CHARACTERS[focusIdx].id);
    });
    return () => { offCancel(); offConfirm(); KeybindService.popScope('modal'); };
  }, [focusIdx, onConfirm, onCancel, CHARACTERS]);

  useEffect(() => { playSfx('modal.open'); return () => playSfx('modal.close'); }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') {
        setFocusIdx(i => (i < 0 ? CHARACTERS.length - 1 : (i - 1 + CHARACTERS.length) % CHARACTERS.length));
        e.preventDefault();
      }
      if (e.key === 'ArrowRight') {
        setFocusIdx(i => (i < 0 ? 0 : (i + 1) % CHARACTERS.length));
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [CHARACTERS.length]);

  const hasFocus    = focusIdx >= 0;
  const focusedChar = hasFocus ? CHARACTERS[focusIdx] : null;

  return (
    <div
      className="char-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="char-modal-title"
      onClick={onCancel}
    >
      <div className="char-modal__panel" role="document" onClick={(e) => e.stopPropagation()}>
        <div className="char-modal__header">
          <span className="char-modal__label">{t('hangar.characterSelect.label')}</span>
        </div>

        <h3 id="char-modal-title" className="char-modal__title">{t('hangar.characterSelect.title')}</h3>

        <div className="char-modal__grid">
          {CHARACTERS.map((c, i) => {
            const isActive  = c.id === currentId;
            const isFocused = i === focusIdx;
            const classes = [
              'char-card',
              isFocused ? 'char-card--focused' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={c.id}
                type="button"
                className={classes}
                onClick={() => setFocusIdx(i)}
                onDoubleClick={() => onConfirm(c.id)}
                aria-pressed={isActive}
              >
                <div className="char-card__portrait-wrap">
                  <img
                    className="char-card__portrait"
                    src={isFocused && c.portraitChosen ? c.portraitChosen : c.portrait}
                    alt={c.name}
                    draggable="false"
                  />
                  <div className="char-card__brackets">
                    <span className="char-card__bracket char-card__bracket--tl" />
                    <span className="char-card__bracket char-card__bracket--tr" />
                    <span className="char-card__bracket char-card__bracket--bl" />
                    <span className="char-card__bracket char-card__bracket--br" />
                  </div>
                  {isActive && <span className="char-card__badge">{t('hangar.characterSelect.active')}</span>}
                </div>
                <div className="char-card__meta">
                  <span className="char-card__name">{c.name.toUpperCase()}</span>
                  <span className="char-card__code">{c.codename} · {c.role}</span>
                  <p className="char-card__bio">{c.bio}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="char-modal__actions">
          <button className="char-modal__btn char-modal__btn--cancel" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button
            className="char-modal__btn char-modal__btn--confirm"
            onClick={() => hasFocus && onConfirm(focusedChar.id)}
            disabled={!hasFocus}
            autoFocus
          >
            {hasFocus ? t('hangar.characterSelect.confirmName', { name: focusedChar.name }) : t('hangar.characterSelect.selectPrompt')}
          </button>
        </div>

        <KeyHint
          className="char-modal__hint"
          items={[
            { key: 'Click / ←→', label: t('keys.navigate') },
            { key: '↵',          label: t('common.confirm').toLowerCase() },
            { key: 'ESC',        label: t('common.cancel').toLowerCase() },
          ]}
        />
      </div>
    </div>
  );
}
