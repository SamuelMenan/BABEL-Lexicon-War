import React, { useState } from 'react';
import { signIn, signUp, signInWithGoogle, isAuthAvailable } from '@game/net/supabase/auth.js';
import Modal from '@app/ui/Modal.jsx';
import KeyHint from '@app/ui/KeyHint.jsx';
import Icon from '@app/ui/Icon.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';

function passwordStrength(p, t) {
  if (!p) return { score: 0, label: '', cls: '' };
  let s = 0;
  if (p.length >= 8)  s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p))                       s++;
  if (/[^A-Za-z0-9]/.test(p))             s++;
  const tiers = [
    { key: 'veryWeak',   cls: 'weak' },
    { key: 'weak',       cls: 'weak' },
    { key: 'ok',         cls: 'mid' },
    { key: 'strong',     cls: 'strong' },
    { key: 'veryStrong', cls: 'strong' },
  ];
  const tier = tiers[Math.min(s, 4)];
  return { score: Math.min(s, 4), label: t(`auth.strength.${tier.key}`), cls: tier.cls };
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default function AuthModal({ initialMode = 'signin', onClose, onSuccess }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo]   = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const available = isAuthAvailable();
  const strength  = mode === 'signup' ? passwordStrength(password, t) : null;
  const emailLooksValid = !email || validEmail(email);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (busy) return;
    setError(null); setInfo(null);
    if (!available) { setError(t('auth.supabaseMissing')); return; }
    if (!email || !password) { setError(t('auth.passwordRequired')); return; }
    if (!validEmail(email))  { setError(t('auth.emailInvalid')); return; }
    if (password.length < 6) { setError(t('auth.passwordMin')); return; }
    setBusy(true);
    try {
      const res = mode === 'signup'
        ? await signUp({ email, password, displayName: displayName || null })
        : await signIn({ email, password });
      if (!res.ok) {
        setError(res.error?.message || t('auth.couldNotComplete'));
        return;
      }
      if (mode === 'signup' && !res.session) {
        setInfo(t('auth.signupConfirmEmail'));
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
    if (!available) { setError(t('auth.supabaseMissingShort')); return; }
    setBusy(true);
    const res = await signInWithGoogle();
    setBusy(false);
    if (!res.ok) {
      setError(res.error?.message || t('auth.couldNotGoogle'));
      return;
    }
    // Redirige a Google. Al volver, onAuthChange dispara onSuccess via MainMenu.
  }

  // Evita que KeybindService (window keydown) consuma Backspace/letras dentro de inputs.
  const stopKeys = (e) => { e.stopPropagation(); };

  return (
    <Modal className="auth-modal" onClose={onClose}>
      <form
        className="auth-modal__panel"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={stopKeys}
        onKeyUp={stopKeys}
        onKeyPress={stopKeys}
        onSubmit={handleSubmit}
      >
        <div className="auth-modal__header">
          <span className="auth-modal__label">◈ {t('auth.label')}</span>
        </div>

        <div
          className="auth-modal__tabs"
          role="tablist"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              const next = mode === 'signin' ? 'signup' : 'signin';
              setMode(next); setError(null); setInfo(null);
            }
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-modal__tab${mode === 'signin' ? ' auth-modal__tab--active' : ''}`}
            onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
          >{t('auth.signIn')}</button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-modal__tab${mode === 'signup' ? ' auth-modal__tab--active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
          >{t('auth.signUp')}</button>
        </div>

        {!available && (
          <p className="auth-modal__warn">
            {t('auth.supabaseMissingDetail')}
          </p>
        )}

        {mode === 'signup' && (
          <label className="auth-modal__field">
            <span>{t('auth.pilotName')}</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('auth.pilotNamePlaceholder')}
              maxLength={32}
              autoComplete="nickname"
              autoFocus
            />
          </label>
        )}

        <label className="auth-modal__field">
          <span>{t('auth.email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            required
            autoFocus={mode === 'signin'}
          />
          {emailTouched && !emailLooksValid && (
            <span className="auth-modal__field-warn">{t('auth.emailInvalid')}</span>
          )}
        </label>

        <label className="auth-modal__field auth-modal__field--password">
          <span>{t('auth.password')}</span>
          <div className="auth-modal__pw-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
              onKeyUp={(e)   => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
              placeholder={showPassword ? t('auth.passwordPlaceholder') : '••••••••'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
            <button
              type="button"
              className="auth-modal__pw-toggle"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              tabIndex={-1}
            ><Icon name={showPassword ? 'visibility_off' : 'visibility'} /></button>
          </div>
          {capsOn && (
            <span className="auth-modal__field-warn">
              <Icon name="warning" size={14} /> {t('auth.capsOn')}
            </span>
          )}
          {mode === 'signup' && password && (
            <div className={`auth-modal__strength auth-modal__strength--${strength.cls}`}>
              <div className="auth-modal__strength-bars">
                {[0, 1, 2, 3, 4].map(i => (
                  <span
                    key={i}
                    className={`auth-modal__strength-bar${i < strength.score ? ' auth-modal__strength-bar--on' : ''}`}
                  />
                ))}
              </div>
              <span className="auth-modal__strength-label">{strength.label}</span>
            </div>
          )}
          {mode === 'signup' && (
            <span className="auth-modal__field-hint">{t('auth.passwordHint')}</span>
          )}
        </label>

        {error && <p className="auth-modal__error">{error}</p>}
        {info  && <p className="auth-modal__info">{info}</p>}

        <div className="auth-modal__actions">
          <button type="button" className="auth-modal__btn auth-modal__btn--cancel" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="auth-modal__btn auth-modal__btn--confirm" disabled={busy || !available}>
            {busy ? t('auth.processing') : mode === 'signup' ? t('auth.submitSignUp') : t('auth.submitSignIn')}
          </button>
        </div>

        <div className="auth-modal__divider"><span>{t('auth.or')}</span></div>

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
          {t('auth.google')}
        </button>

        <div className="auth-modal__alt">
          <button
            type="button"
            className="auth-modal__link"
            onClick={handleGuest}
            disabled={busy}
          >
            {t('auth.guest')}
          </button>
        </div>

        <KeyHint
          className="auth-modal__hint"
          items={[{ key: 'ESC', label: t('auth.cancelKey') }]}
        />
      </form>
    </Modal>
  );
}
