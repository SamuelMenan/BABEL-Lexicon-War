import React, { useEffect, useState } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import { listCharacters } from '../../../shared/characterData.js';

const CHARACTERS = listCharacters();

export default function CharacterSelectModal({ currentId, onConfirm, onCancel }) {
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
  }, [focusIdx, onConfirm, onCancel]);

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
  }, []);

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
          <span className="char-modal__label">◈ SELECCIÓN · PILOTO</span>
        </div>

        <h3 id="char-modal-title" className="char-modal__title">ELIGE TU PILOTO</h3>

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
                  {isActive && <span className="char-card__badge">ACTIVO</span>}
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
            Cancelar
          </button>
          <button
            className="char-modal__btn char-modal__btn--confirm"
            onClick={() => hasFocus && onConfirm(focusedChar.id)}
            disabled={!hasFocus}
            autoFocus
          >
            {hasFocus ? `Confirmar · ${focusedChar.name}` : 'Selecciona un piloto'}
          </button>
        </div>

        <p className="char-modal__hint">CLICK / ←→ NAVEGAR · ↵ CONFIRMAR · ESC CANCELAR</p>
      </div>
    </div>
  );
}
