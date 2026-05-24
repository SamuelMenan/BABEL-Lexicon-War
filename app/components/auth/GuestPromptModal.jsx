import React, { useEffect, useState } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import AuthModal from './AuthModal.jsx';

const FEATURE_COPY = {
  purchase:    'comprar naves',
  leaderboard: 'aparecer en la clasificacion',
  combat:      'guardar tu progreso de Combate en la clasificacion',
  racing:      'guardar tu progreso de Carrera en la clasificacion',
  default:     'usar funciones de usuario',
};

export default function GuestPromptModal({ feature = 'default', onClose, onAuthSuccess }) {
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

  const action = FEATURE_COPY[feature] || FEATURE_COPY.default;

  return (
    <div className="guest-prompt" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="guest-prompt__panel" onClick={(e) => e.stopPropagation()}>
        <div className="guest-prompt__header">
          <span className="guest-prompt__label">◈ ACCESO REQUERIDO</span>
        </div>
        <h3 className="guest-prompt__title">Funcion bloqueada</h3>
        <p className="guest-prompt__text">
          Estas en modo <strong>Invitado</strong>. Para <strong>{action}</strong> necesitas
          iniciar sesion o crear una cuenta. Puedes seguir jugando Combate, Carrera y Hangar
          sin cuenta.
        </p>
        <div className="guest-prompt__actions">
          <button type="button" className="guest-prompt__btn guest-prompt__btn--ghost" onClick={onClose}>
            Seguir como invitado
          </button>
          <button type="button" className="guest-prompt__btn guest-prompt__btn--primary" onClick={() => setShowAuth(true)}>
            Iniciar sesion
          </button>
        </div>
        <p className="guest-prompt__hint">ESC cerrar</p>
      </div>
    </div>
  );
}
