import React from 'react';
import KeyboardNavigable from '../common/KeyboardNavigable.jsx';
import { isSupabaseConfigured } from '../../services/supabase/client.js';

// Modal mostrado al presionar "Carrera" en MainMenu: Single vs Online.
export default function RaceModeSelectModal({ onSelectSingle, onSelectOnline, onClose }) {
  const onlineAvailable = isSupabaseConfigured;

  const items = [
    { id: 'single', label: 'Un jugador',        desc: 'Carrera contra IA — 60s.',                 action: onSelectSingle, accent: 'var(--col-primary)' },
    { id: 'online', label: 'En linea',          desc: onlineAvailable ? 'Compite 1v1 en tiempo real.' : 'Supabase no configurado.', action: onlineAvailable ? onSelectOnline : null, accent: 'var(--col-active)', disabled: !onlineAvailable },
    { id: 'back',   label: 'Volver',            desc: 'Regresar al menu principal.',              action: onClose,        accent: 'var(--text-dim)' },
  ];

  return (
    <div className="race-mode-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="race-mode-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="race-mode-modal__header">
          <span className="race-mode-modal__label">◈ MODO CARRERA</span>
          <button type="button" className="race-mode-modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <h2 className="race-mode-modal__title">Selecciona modo</h2>
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
          <p className="race-mode-modal__hint">⚠ Modo en linea requiere Supabase configurado.</p>
        )}
      </div>
    </div>
  );
}
