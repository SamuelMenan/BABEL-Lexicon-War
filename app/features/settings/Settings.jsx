import React, { useState, useCallback, useEffect, useRef } from "react";
import KeyboardNavigable from "@app/ui/KeyboardNavigable.jsx";
import { EXECUTION_MODE } from "@shared/config/constants.js";
import { workerBridge } from "@game/domains/lexicon/workers/workerBridge.js";
import { EconomySystem } from "@game/domains/economy/EconomySystem.js";
import { Bridge } from "@shared/state/bridge.js";
import { resetTutorialFlags } from "@shared/tutorial/tutorialFlags.js";
import { KeybindService } from "@shared/services/keybindService.js";
import { QUALITY, setQualityTier, getQualityTier } from "@shared/config/qualitySettings.js";
import Modal from "@app/ui/Modal.jsx";
import useTranslation from "@shared/i18n/useTranslation.js";
import { getNumberFormatter } from "@shared/i18n/index.js";
import { getAudioSettings, setSfxVolume, setBgmVolume, mute, playSfx } from "@shared/services/audioManager.js";
import ControlsSection from "./ControlsSection.jsx";
import Icon from "@app/ui/Icon.jsx";
import KeyHint from "@app/ui/KeyHint.jsx";
import "../../../styles/features/settings/controls-section.css";

const TAB_IDS = ['rendimiento', 'audio', 'controls', 'profile'];

// Settings v2 — solo los que SI funcionan en el juego. Auditoria previa
// eliminó shadows/postProcessing/particleDensity/screenFlash/cameraShake,
// audio.*, lexicalDifficulty/wordSpeed/autoRepeat/showPhonetics — ninguno
// estaba conectado a sistema alguno. Mantenidos: quality + executionMode.
const DEFAULT_SETTINGS = {
  quality:       QUALITY.MID,
  executionMode: EXECUTION_MODE.NORMAL,
};

const SETTINGS_STORAGE_KEY    = 'babel-settings:v2';
const LEGACY_STORAGE_KEY_V1   = 'babel-settings:v1';

function loadSettings() {
  // v2 actual
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  // Migración suave desde v1 — extrae solo lo que aun importa.
  try {
    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY_V1);
    if (rawV1) {
      const v1 = JSON.parse(rawV1);
      const migrated = {
        quality:       v1?.visuals?.quality        ?? DEFAULT_SETTINGS.quality,
        executionMode: v1?.protocol?.executionMode ?? DEFAULT_SETTINGS.executionMode,
      };
      // Normaliza 'medium' (v1) → 'mid' (v2 mapping qualitySettings)
      if (migrated.quality === 'medium') migrated.quality = QUALITY.MID;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
      return migrated;
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Aplica settings al runtime — se llama al cargar Settings + en cada cambio.
function applySettings(s) {
  if (s.quality)       setQualityTier(s.quality);
  if (s.executionMode) workerBridge.setMode(s.executionMode);
}

/* ── Primitives ──────────────────────────────────────────────── */

function SciSelect({ options, value, onChange }) {
  const containerRef = useRef(null);

  const onKeyDown = (e) => {
    const idx = options.findIndex(o => o.value === value);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const i = (idx - 1 + options.length) % options.length;
      onChange(options[i].value);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const i = (idx + 1) % options.length;
      onChange(options[i].value);
    } else if (e.key === 'Home') {
      e.preventDefault(); onChange(options[0].value);
    } else if (e.key === 'End') {
      e.preventDefault(); onChange(options[options.length - 1].value);
    }
  };

  useEffect(() => {
    if (containerRef.current && containerRef.current.contains(document.activeElement)) {
      const activeBtn = containerRef.current.querySelector('.settings__select-opt--active');
      activeBtn?.focus();
    }
  }, [value]);

  return (
    <div ref={containerRef} className="settings__select" role="radiogroup" onKeyDown={onKeyDown}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={`settings__select-opt${active ? ' settings__select-opt--active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="settings__row">
      <div className="settings__row-meta">
        <span className="settings__row-label">{label}</span>
        {hint && <span className="settings__row-hint">{hint}</span>}
      </div>
      <div className="settings__row-control">{children}</div>
    </div>
  );
}

/* ── Profile section ──────────────────────────────────────── */

function ProfileSection() {
  const { t } = useTranslation();
  const [confirmStep, setConfirmStep] = useState(0);
  const [profile, setProfile] = useState(() => EconomySystem.getProfile());
  const [code, setCode] = useState('');
  const [redeemMsg, setRedeemMsg] = useState(null);

  const refresh = () => setProfile(EconomySystem.getProfile());

  // Canje de codigo secreto. Recarga tras exito para que el hangar (que evalua
  // getShipsForHangar al cargar el modulo) revele la nave desbloqueada.
  const onRedeem = () => {
    const res = EconomySystem.redeemCode(code);
    if (res.ok) {
      setRedeemMsg({ ok: true, text: t('settings.profile.redeemOk') });
      setTimeout(() => { try { window.location.reload(); } catch { /* ignore */ } }, 1200);
    } else {
      const key = res.reason === 'already_owned' ? 'redeemOwned' : 'redeemInvalid';
      setRedeemMsg({ ok: false, text: t(`settings.profile.${key}`) });
    }
  };

  const onReset = () => {
    if (confirmStep === 0) { setConfirmStep(1); return; }
    if (confirmStep === 1) { setConfirmStep(2); return; }
    EconomySystem.reset();
    setConfirmStep(0);
    refresh();
  };

  const formatter = getNumberFormatter();
  const fmt = n => formatter.format(n ?? 0);
  const labels = [
    t('settings.profile.resetProfile'),
    t('settings.profile.confirmStep1'),
    t('settings.profile.confirmStep2')
  ];

  return (
    <div className="settings__section" key="profile">
      <Row label={t('settings.profile.grafemas')} hint={t('settings.profile.grafemasHint')}>
        <span className="settings__readout">₲ {fmt(profile.grafemas)}</span>
      </Row>
      <Row label={t('settings.profile.ownedShips')} hint={t('settings.profile.ownedShipsHint')}>
        <span className="settings__readout">{profile.ownedShips.length}</span>
      </Row>
      <Row label={t('settings.profile.equippedShip')}>
        <span className="settings__readout">{profile.equippedShip}</span>
      </Row>
      <Row label={t('settings.profile.totalKills')} hint={t('settings.profile.totalKillsHint')}>
        <span className="settings__readout">{fmt(profile.stats.kills)}</span>
      </Row>
      <Row label={t('settings.profile.racesWon')}>
        <span className="settings__readout">{fmt(profile.stats.racesWon)}</span>
      </Row>
      <Row label={t('settings.profile.totalEarned')}>
        <span className="settings__readout">₲ {fmt(profile.stats.totalGrafemasEarned)}</span>
      </Row>
      <Row label={t('settings.profile.totalSpent')}>
        <span className="settings__readout">₲ {fmt(profile.stats.totalGrafemasSpent)}</span>
      </Row>
      <Row label={t('settings.profile.tutorials')} hint={t('settings.profile.tutorialsHint')}>
        <button
          type="button"
          className="settings__reset"
          onClick={() => { resetTutorialFlags(); Bridge.commands.resetTutorials(); }}
        >
          {t('settings.profile.repeatTutorials')}
        </button>
      </Row>
      <Row label={t('settings.profile.typingTutorial')} hint={t('settings.profile.typingTutorialHint')}>
        <button
          type="button"
          className="settings__reset"
          onClick={() => Bridge.commands.startTutorial('typing')}
        >
          {t('settings.profile.viewTypingTutorial')}
        </button>
      </Row>

      <Row label={t('settings.profile.redeemLabel')} hint={t('settings.profile.redeemHint')}>
        <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('settings.profile.redeemPlaceholder')}
            maxLength={24}
            spellCheck={false}
            autoComplete="off"
            style={{
              width: '8rem', textTransform: 'uppercase', letterSpacing: '0.1em',
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,204,0.25)',
              color: '#cfe', padding: '0.3rem 0.5rem', fontFamily: 'inherit', fontSize: '0.75rem',
            }}
          />
          <button type="button" className="settings__reset" onClick={onRedeem} disabled={!code.trim()}>
            {t('settings.profile.redeemBtn')}
          </button>
        </span>
      </Row>
      {redeemMsg && (
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', letterSpacing: '0.06em',
                    color: redeemMsg.ok ? '#00ff88' : '#ff6655' }}>
          {redeemMsg.text}
        </p>
      )}

      <div className="settings__danger-zone">
        <p className="settings__danger-note">
          {t('settings.profile.dangerNote')}
        </p>
        <button
          type="button"
          className={`settings__danger-btn${confirmStep > 0 ? ' settings__danger-btn--armed' : ''}`}
          onClick={onReset}
        >
          {labels[confirmStep]}
        </button>
        {confirmStep > 0 && (
          <button
            type="button"
            className="settings__danger-cancel"
            onClick={() => setConfirmStep(0)}
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

function AudioSection() {
  const { t } = useTranslation();
  const [audioState, setAudioState] = useState(() => getAudioSettings());

  const handleSfxChange = (e) => {
    const val = parseFloat(e.target.value);
    setSfxVolume(val);
    setAudioState(prev => ({ ...prev, sfxVolume: val }));
  };

  const handleBgmChange = (e) => {
    const val = parseFloat(e.target.value);
    setBgmVolume(val);
    setAudioState(prev => ({ ...prev, bgmVolume: val }));
  };

  const handleMuteChange = (e) => {
    const val = e.target.checked;
    mute(val);
    setAudioState(prev => ({ ...prev, muted: val }));
  };

  const sliderStyle = { flex: 1, accentColor: 'var(--col-active, #00ffcc)' };
  const readoutStyle = { marginLeft: '12px', minWidth: '3em', display: 'inline-block', textAlign: 'right' };

  return (
    <div className="settings__section" key="audio">
      <Row label={t('settings.audio.sfxVolume')} hint={t('settings.audio.sfxVolumeHint')}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <input type="range" min="0" max="1" step="0.05" value={audioState.sfxVolume}
            onChange={handleSfxChange} className="settings__slider" style={sliderStyle} />
          <span className="settings__readout" style={readoutStyle}>{Math.round(audioState.sfxVolume * 100)}%</span>
        </div>
      </Row>
      <Row label={t('settings.audio.bgmVolume')} hint={t('settings.audio.bgmVolumeHint')}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <input type="range" min="0" max="1" step="0.05" value={audioState.bgmVolume}
            onChange={handleBgmChange} className="settings__slider" style={sliderStyle} />
          <span className="settings__readout" style={readoutStyle}>{Math.round(audioState.bgmVolume * 100)}%</span>
        </div>
      </Row>
      <Row label={t('settings.audio.mute')} hint={t('settings.audio.muteHint')}>
        <input type="checkbox" checked={audioState.muted} onChange={handleMuteChange}
          style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--col-active, #00ffcc)' }} />
      </Row>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export default function Settings({ onClose, initialTab = 'rendimiento' }) {
  // Re-mapeo de tabs legacy ('visuals'/'protocol' → 'rendimiento').
  const normalizedInitial = ['visuals', 'protocol'].includes(initialTab)
    ? 'rendimiento'
    : initialTab;
  const [tab, setTab] = useState(normalizedInitial);
  const [s, setS]     = useState(loadSettings);
  const { t, locale, setLocale, locales } = useTranslation();
  const [tabIdx, setTabIdx] = useState(() => Math.max(0, TAB_IDS.indexOf(normalizedInitial)));
  const [activeArea, setActiveArea] = useState('sidebar'); // 'sidebar' | 'content'

  const TABS = [
    { id: 'rendimiento', label: t('settings.tabs.performance') },
    { id: 'audio',       label: t('settings.tabs.audio') },
    { id: 'controls',    label: t('settings.tabs.controls') },
    { id: 'profile',     label: t('settings.tabs.profile') },
  ];

  const QUALITY_OPTS = [
    { value: QUALITY.LOW,  label: t('settings.qualityOpts.low') },
    { value: QUALITY.MID,  label: t('settings.qualityOpts.mid') },
    { value: QUALITY.HIGH, label: t('settings.qualityOpts.high') },
  ];

  const EXEC_MODE_OPTS = [
    { value: EXECUTION_MODE.NORMAL,   label: t('settings.execModeOpts.normal') },
    { value: EXECUTION_MODE.PARALLEL, label: t('settings.execModeOpts.parallel') },
  ];

  // Aplicar settings al montar (sincroniza runtime con localStorage).
  useEffect(() => {
    applySettings(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTab(normalizedInitial);
  }, [normalizedInitial]);

  useEffect(() => {
    if (activeArea !== 'sidebar') return;

    const offUp = KeybindService.register('modal', 'NAV_UP', () => {
      setTabIdx(cur => {
        const next = (cur - 1 + TAB_IDS.length) % TAB_IDS.length;
        setTab(TAB_IDS[next]);
        setTimeout(() => {
          const btns = document.querySelectorAll('.settings__tab');
          btns[next]?.focus();
        }, 0);
        return next;
      });
      return true;
    });

    const offDown = KeybindService.register('modal', 'NAV_DOWN', () => {
      setTabIdx(cur => {
        const next = (cur + 1) % TAB_IDS.length;
        setTab(TAB_IDS[next]);
        setTimeout(() => {
          const btns = document.querySelectorAll('.settings__tab');
          btns[next]?.focus();
        }, 0);
        return next;
      });
      return true;
    });

    const enterContent = () => {
      const el = contentRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (el) {
        el.focus();
        setActiveArea('content');
      }
    };

    const offNext = KeybindService.register('modal', 'NAV_NEXT', () => {
      enterContent();
      return true;
    });

    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => {
      enterContent();
      return true;
    });

    return () => {
      offUp();
      offDown();
      offNext();
      offConfirm();
    };
  }, [activeArea]);

  const handleContentKeyDown = (e) => {
    const focusables = Array.from(contentRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []);

    if (e.key === 'ArrowDown') {
      const idx = focusables.indexOf(document.activeElement);
      if (idx >= 0) {
        e.preventDefault();
        const next = (idx + 1) % focusables.length;
        focusables[next]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      const idx = focusables.indexOf(document.activeElement);
      if (idx >= 0) {
        e.preventDefault();
        const prev = (idx - 1 + focusables.length) % focusables.length;
        focusables[prev]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      const target = e.target;
      if (!target) return;

      let shouldGoBack = false;

      if (target.tagName === 'INPUT' && target.type === 'range') {
        if (parseFloat(target.value) === 0) {
          shouldGoBack = true;
        }
      } else if (target.classList.contains('settings__select-opt')) {
        const parent = target.parentElement;
        const options = Array.from(parent?.querySelectorAll('.settings__select-opt') || []);
        if (options.indexOf(target) === 0) {
          shouldGoBack = true;
        }
      } else {
        shouldGoBack = true;
      }

      if (shouldGoBack) {
        e.preventDefault();
        setActiveArea('sidebar');
        setTimeout(() => {
          const btns = document.querySelectorAll('.settings__tab');
          btns[tabIdx]?.focus();
        }, 0);
      }
    }
  };

  // autoFocus primer interactive del panel cuando tab CAMBIA (no mount inicial).
  const contentRef = useRef(null);
  const prevTabRef = useRef(normalizedInitial);
  useEffect(() => {
    if (prevTabRef.current === tab) return;
    prevTabRef.current = tab;
    const el = contentRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    el?.focus?.();
  }, [tab]);

  const set = useCallback((key, val) => {
    setS(prev => {
      const next = { ...prev, [key]: val };
      saveSettings(next);
      // Wire al runtime: setQualityTier para quality, workerBridge.setMode para exec.
      if (key === 'quality')       setQualityTier(val);
      if (key === 'executionMode') {
        workerBridge.setMode(val);
        window.dispatchEvent(new CustomEvent('babel:executionMode', { detail: val }));
      }
      return next;
    });
  }, []);

  const handleReset = () => {
    saveSettings(DEFAULT_SETTINGS);
    setS(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
  };

  return (
    <Modal className="settings" panelClassName="settings__panel" onClose={onClose}>
        <span className="settings__scan" aria-hidden="true" />

        {/* Header */}
        <div className="settings__header">
          <div className="settings__header-left">
            <span className="settings__header-label">{t('settings.header')}</span>
            <h2 className="settings__title">{t('settings.title')}</h2>
          </div>
          <button type="button" className="settings__close" onClick={onClose} aria-label={t('settings.closeAria')}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Sidebar + content */}
        <div className="settings__body">
          <div className="settings__tabs" role="tablist">
            {TABS.map((item, i) => {
              const isActive = tab === item.id;
              const isFocused = activeArea === 'sidebar' && i === tabIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`settings__tab${isActive ? ' settings__tab--active' : ''}${isFocused ? ' settings__tab--focused' : ''}`}
                  onClick={() => {
                    setTabIdx(i);
                    setTab(item.id);
                    setActiveArea('sidebar');
                  }}
                  onFocus={() => {
                    setTabIdx(i);
                    setActiveArea('sidebar');
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

        {/* Content */}
        <div
          className="settings__content"
          ref={contentRef}
          onKeyDown={handleContentKeyDown}
          onFocus={() => setActiveArea('content')}
        >

          {tab === 'rendimiento' && (
            <div className="settings__section" key="rendimiento">
              <Row
                label={t('settings.quality.label')}
                hint={t('settings.quality.hint')}
              >
                <SciSelect
                  options={QUALITY_OPTS}
                  value={s.quality}
                  onChange={v => set('quality', v)}
                />
              </Row>
              <Row
                label={t('settings.execMode.label')}
                hint={t('settings.execMode.hint')}
              >
                <SciSelect
                  options={EXEC_MODE_OPTS}
                  value={s.executionMode}
                  onChange={v => set('executionMode', v)}
                />
              </Row>
              <Row
                label={t('settings.language.label')}
                hint={t('settings.language.hint')}
              >
                <SciSelect
                  options={locales.map(l => ({
                    value: l,
                    label: l === 'es' ? 'Español' : 'English',
                  }))}
                  value={locale}
                  onChange={(v) => setLocale(v)}
                />
              </Row>
            </div>
          )}

          {tab === 'audio'    && <AudioSection />}
          {tab === 'controls' && <ControlsSection />}
          {tab === 'profile'  && <ProfileSection />}

        </div>
        </div>

        {/* Footer */}
        <div className="settings__footer">
          <span className="settings__footer-note">{t('settings.footerNote')}</span>
          <KeyHint
            className="settings__hint"
            items={[
              { key: '↑/↓', label: t('keys.navigate') },
              { key: '←/→', label: t('keys.select') },
              { key: 'ESC', label: t('common.close').toLowerCase() }
            ]}
          />
          <button type="button" className="settings__reset" onClick={handleReset}>
            {t('settings.restore')}
          </button>
        </div>

    </Modal>
  );
}
