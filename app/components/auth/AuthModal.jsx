import React, { useEffect, useState } from 'react';
import { signIn, signUp, signInAnonymously, isAuthAvailable } from '../../services/supabase/auth.js';
import { KeybindService } from '../../../shared/keybindService.js';

export default function AuthModal({ initialMode = 'signin', onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo]   = useState(null);

  const available = isAuthAvailable();

  useEffect(() => {
    KeybindService.pushScope('modal');
    const offCancel = KeybindService.register('modal', 'CANCEL', () => onClose());
    return () => { offCancel(); KeybindService.popScope('modal'); };
  }, [onClose]);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (busy) return;
    setError(null); setInfo(null);
    if (!available) { setError('Supabase no configurado. Modo offline activo.'); return; }
    if (!email || !password) { setError('Email y contraseña requeridos.'); return; }
    setBusy(true);
    try {
      const res = mode === 'signup'
        ? await signUp({ email, password, displayName: displayName || null })
        : await signIn({ email, password });
      if (!res.ok) {
        setError(res.error?.message || 'No se pudo completar la operación.');
        return;
      }
      if (mode === 'signup' && !res.session) {
        setInfo('Cuenta creada. Revisa tu email para confirmar (si la verificación está activada).');
        return;
      }
      onSuccess?.(res.user);
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  async function handleAnonymous() {
    if (busy) return;
    setError(null); setInfo(null);
    setBusy(true);
    try {
      const res = await signInAnonymously();
      if (!res.ok) { setError(res.error?.message || 'Anónimo no disponible.'); return; }
      onSuccess?.(res.user);
      onClose?.();
    } finally { setBusy(false); }
  }

  // Evita que KeybindService (window keydown) consuma Backspace/letras dentro de inputs.
  const stopKeys = (e) => { e.stopPropagation(); };

  return (
    <div className="auth-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="auth-modal__panel"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={stopKeys}
        onKeyUp={stopKeys}
        onKeyPress={stopKeys}
        onSubmit={handleSubmit}
      >
        <div className="auth-modal__header">
          <span className="auth-modal__label">◈ ACCESO · PILOTO</span>
        </div>

        <div className="auth-modal__tabs">
          <button
            type="button"
            className={`auth-modal__tab${mode === 'signin' ? ' auth-modal__tab--active' : ''}`}
            onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
          >Iniciar sesión</button>
          <button
            type="button"
            className={`auth-modal__tab${mode === 'signup' ? ' auth-modal__tab--active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
          >Registrarse</button>
        </div>

        {!available && (
          <p className="auth-modal__warn">
            Supabase no configurado. Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        )}

        {mode === 'signup' && (
          <label className="auth-modal__field">
            <span>Nombre de piloto</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Kael"
              maxLength={32}
              autoComplete="nickname"
            />
          </label>
        )}

        <label className="auth-modal__field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="piloto@dominio.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="auth-modal__field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />
        </label>

        {error && <p className="auth-modal__error">{error}</p>}
        {info  && <p className="auth-modal__info">{info}</p>}

        <div className="auth-modal__actions">
          <button type="button" className="auth-modal__btn auth-modal__btn--cancel" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="auth-modal__btn auth-modal__btn--confirm" disabled={busy || !available}>
            {busy ? 'Procesando…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </div>

        <div className="auth-modal__alt">
          <button
            type="button"
            className="auth-modal__link"
            onClick={handleAnonymous}
            disabled={busy || !available}
          >
            Continuar como invitado (anónimo)
          </button>
        </div>

        <p className="auth-modal__hint">ESC cancelar</p>
      </form>
    </div>
  );
}
