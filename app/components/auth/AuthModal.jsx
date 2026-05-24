import React, { useEffect, useState } from 'react';
import { signIn, signUp, signInWithGoogle, isAuthAvailable } from '../../services/supabase/auth.js';
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
        setError(res.error?.message || 'No se pudo completar la operacion.');
        return;
      }
      if (mode === 'signup' && !res.session) {
        setInfo('Cuenta creada. Revisa tu email para confirmar (si la verificacion esta activada).');
        return;
      }
      onSuccess?.(res.user);
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  function handleGuest() {
    // Modo invitado = perfil local, sin Supabase auth. Solo cierra modal.
    setError(null); setInfo(null);
    onClose?.();
  }

  async function handleGoogle() {
    if (busy) return;
    setError(null); setInfo(null);
    if (!available) { setError('Supabase no configurado.'); return; }
    setBusy(true);
    const res = await signInWithGoogle();
    setBusy(false);
    if (!res.ok) {
      setError(res.error?.message || 'No se pudo iniciar con Google.');
      return;
    }
    // Redirige a Google. Al volver, onAuthChange dispara onSuccess via MainMenu.
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
          >Iniciar sesion</button>
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

        <div className="auth-modal__divider"><span>o</span></div>

        <button
          type="button"
          className="auth-modal__google"
          onClick={handleGoogle}
          disabled={busy || !available}
        >
          <svg className="auth-modal__google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
            <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.45.36-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="auth-modal__alt">
          <button
            type="button"
            className="auth-modal__link"
            onClick={handleGuest}
            disabled={busy}
          >
            Continuar como invitado
          </button>
        </div>

        <p className="auth-modal__hint">ESC cancelar</p>
      </form>
    </div>
  );
}
