import React, { useState, useCallback, useEffect } from "react";
import { EXECUTION_MODE } from "../../shared/constants.js";
import { workerBridge } from "../../game/workers/workerBridge.js";
import { EconomySystem } from "../../game/systems/EconomySystem.js";
import { Bridge } from "../../shared/bridge.js";
import { resetTutorialFlags } from "../../shared/tutorialFlags.js";
import { KeybindService } from "../../shared/keybindService.js";
import { QUALITY, setQualityTier, getQualityTier } from "../../shared/qualitySettings.js";
import useTranslation from "../../shared/i18n/useTranslation.js";
import { getNumberFormatter } from "../../shared/i18n/index.js";
import ControlsSection from "./settings/ControlsSection.jsx";
import Icon from "./common/Icon.jsx";
import "../../styles/components/controls-section.css";

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
  return (
    <div className="settings__select">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`settings__select-opt${value === o.value ? ' settings__select-opt--active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
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

  const refresh = () => setProfile(EconomySystem.getProfile());

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

/* ── Main component ──────────────────────────────────────────── */

export default function Settings({ onClose, initialTab = 'rendimiento' }) {
  // Re-mapeo de tabs legacy ('visuals'/'audio'/'protocol' → 'rendimiento').
  const normalizedInitial = ['visuals', 'audio', 'protocol'].includes(initialTab)
    ? 'rendimiento'
    : initialTab;
  const [tab, setTab] = useState(normalizedInitial);
  const [s, setS]     = useState(loadSettings);
  const { t, locale, setLocale, locales } = useTranslation();

  const TABS = [
    { id: 'rendimiento', label: t('settings.tabs.performance') },
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

  // Push 'modal' scope mientras Settings esta montado.
  useEffect(() => {
    KeybindService.pushScope('modal');
    const offCancel = KeybindService.register('modal', 'CANCEL', () => onClose?.());
    const offPrev   = KeybindService.register('modal', 'NAV_PREV', () => {
      setTab(t => { const i = TABS.findIndex(x => x.id === t); return TABS[(i - 1 + TABS.length) % TABS.length].id; });
    });
    const offNext   = KeybindService.register('modal', 'NAV_NEXT', () => {
      setTab(t => { const i = TABS.findIndex(x => x.id === t); return TABS[(i + 1) % TABS.length].id; });
    });
    return () => { offCancel(); offPrev(); offNext(); KeybindService.popScope('modal'); };
  }, [onClose]);

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
    <div className="settings">
      <div className="settings__panel">
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

        {/* Tabs */}
        <div className="settings__tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`settings__tab${tab === t.id ? ' settings__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings__content">

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

          {tab === 'controls' && <ControlsSection />}
          {tab === 'profile'  && <ProfileSection />}

        </div>

        {/* Footer */}
        <div className="settings__footer">
          <span className="settings__footer-note">{t('settings.footerNote')}</span>
          <button type="button" className="settings__reset" onClick={handleReset}>
            {t('settings.restore')}
          </button>
        </div>

      </div>
    </div>
  );
}
