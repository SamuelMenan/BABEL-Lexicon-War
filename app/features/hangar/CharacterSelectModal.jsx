import React, { useEffect, useState } from 'react';
import { KeybindService } from '@shared/services/keybindService.js';
import { listCharacters } from '@shared/data/characterData.js';
import { playSfx } from '@shared/services/audioManager.js';
import KeyHint from '@app/ui/KeyHint.jsx';
import Modal from '@app/ui/Modal.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';

export default function CharacterSelectModal({ currentId, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const CHARACTERS = listCharacters();
  const [selectedId, setSelectedId] = useState(currentId);
  const [focusIdx, setFocusIdx] = useState(() => {
    const idx = CHARACTERS.findIndex(c => c.id === currentId);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => {
      if (focusIdx < 0) return true;
      const hoveredId = CHARACTERS[focusIdx].id;
      if (selectedId !== hoveredId) {
        setSelectedId(hoveredId);
        playSfx('ui.click');
      } else {
        onConfirm(selectedId);
      }
      return true;
    });
    const offPrev = KeybindService.register('modal', 'NAV_PREV', () => {
      setFocusIdx(i => (i < 0 ? CHARACTERS.length - 1 : (i - 1 + CHARACTERS.length) % CHARACTERS.length));
      return true;
    });
    const offNext = KeybindService.register('modal', 'NAV_NEXT', () => {
      setFocusIdx(i => (i < 0 ? 0 : (i + 1) % CHARACTERS.length));
      return true;
    });
    return () => {
      offConfirm();
      offPrev();
      offNext();
    };
  }, [focusIdx, selectedId, onConfirm, CHARACTERS]);

  const hasSelection = !!selectedId;
  const selectedChar = CHARACTERS.find(c => c.id === selectedId) || null;

  return (
    <Modal
      className="char-modal"
      panelClassName="char-modal__panel"
      onClose={onCancel}
      labelledBy="char-modal-title"
    >
      <div className="char-modal__header">
        <span className="char-modal__label">{t('hangar.characterSelect.label')}</span>
      </div>

      <h3 id="char-modal-title" className="char-modal__title">{t('hangar.characterSelect.title')}</h3>

      <div className="char-modal__grid">
        {CHARACTERS.map((c, i) => {
          const isActive  = c.id === selectedId;
          const isFocused = i === focusIdx;
          const classes = [
            'char-card',
            isActive ? 'char-card--active' : '',
            isFocused ? 'char-card--focused' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={c.id}
              type="button"
              className={classes}
              onClick={() => {
                setFocusIdx(i);
                setSelectedId(c.id);
              }}
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
        <KeyHint
          className="char-modal__hint"
          items={[
            { key: 'Click / ←→', label: t('keys.navigate') },
            { key: '↵',          label: t('common.confirm').toLowerCase() },
            { key: 'ESC',        label: t('common.cancel').toLowerCase() },
          ]}
        />
        <div className="char-modal__actions-buttons">
          <button type="button" className="char-modal__btn char-modal__btn--cancel" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button"
            className="char-modal__btn char-modal__btn--confirm"
            onClick={() => hasSelection && onConfirm(selectedId)}
            disabled={!hasSelection}
          >
            {hasSelection ? t('hangar.characterSelect.confirmName', { name: selectedChar.name }) : t('hangar.characterSelect.selectPrompt')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
