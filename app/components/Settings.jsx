import React, { useState, useCallback, useEffect } from "react";
import { EXECUTION_MODE } from "../../shared/constants.js";
import { workerBridge } from "../../game/workers/workerBridge.js";
import { EconomySystem } from "../../game/systems/EconomySystem.js";
import { Bridge } from "../../shared/bridge.js";
import { resetTutorialFlags, getAllSeen } from "../../shared/tutorialFlags.js";
import { KeybindService } from "../../shared/keybindService.js";
import ControlsSection from "./settings/ControlsSection.jsx";
import "../../styles/components/controls-section.css";

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES');

const DEFAULT_SETTINGS = {
  visuals: {
    quality:          'high',
    shadows:          true,
    postProcessing:   true,
    particleDensity:  75,
    screenFlash:      true,
    cameraShake:      true,
  },
  audio: {
    sfx:    80,
    music:  60,
    voices: 100,
  },
  protocol: {
    lexicalDifficulty: 'normal',
    wordSpeed:         50,
    autoRepeat:        false,
    showPhonetics:     false,
    executionMode:     EXECUTION_MODE.NORMAL,
  },
};

const SETTINGS_STORAGE_KEY = 'babel-settings:v1';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        visuals:  { ...DEFAULT_SETTINGS.visuals,  ...parsed.visuals },
        audio:    { ...DEFAULT_SETTINGS.audio,    ...parsed.audio },
        protocol: { ...DEFAULT_SETTINGS.protocol, ...parsed.protocol },
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/* ── Primitives ──────────────────────────────────────────────── */

function SciToggle({ value, onChange }) {
  return (
    <button
      type="button"
      className={`settings__toggle${value ? ' settings__toggle--on' : ''}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    >
      <span className="settings__toggle-track">
        <span className="settings__toggle-thumb" />
      </span>
      <span className="settings__toggle-label">{value ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function SciSlider({ value, min = 0, max = 100, onChange, unit = '' }) {
  return (
    <div className="settings__slider">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="settings__slider-input"
      />
      <span className="settings__slider-val">{value}{unit}</span>
    </div>
  );
}

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

/* ── Main component ──────────────────────────────────────────── */

const TABS = [
  { id: 'visuals',  label: 'Visuales' },
  { id: 'audio',    label: 'Audio' },
  { id: 'protocol', label: 'Protocolo' },
  { id: 'controls', label: 'Controles' },
  { id: 'profile',  label: 'Perfil' },
];

const QUALITY_OPTS = [
  { value: 'low',    label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high',   label: 'Alta' },
];

const DIFFICULTY_OPTS = [
  { value: 'easy',   label: 'Básico' },
  { value: 'normal', label: 'Estándar' },
  { value: 'hard',   label: 'Avanzado' },
  { value: 'elite',  label: 'Elite' },
];

function ProfileSection() {
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

  const fmt = n => NUMBER_FORMATTER.format(n ?? 0);
  const labels = ['Reiniciar Perfil', 'Confirmar (1/2)', 'Confirmar definitivamente (2/2)'];

  return (
    <div className="settings__section" key="profile">
      <Row label="Grafemas" hint="Saldo actual del piloto">
        <span className="settings__readout">₲ {fmt(profile.grafemas)}</span>
      </Row>
      <Row label="Naves en Hangar" hint="Inventario de naves desbloqueadas">
        <span className="settings__readout">{profile.ownedShips.length}</span>
      </Row>
      <Row label="Nave Equipada">
        <span className="settings__readout">{profile.equippedShip}</span>
      </Row>
      <Row label="Kills Totales" hint="Enemigos colapsados acumulados">
        <span className="settings__readout">{fmt(profile.stats.kills)}</span>
      </Row>
      <Row label="Carreras Ganadas">
        <span className="settings__readout">{fmt(profile.stats.racesWon)}</span>
      </Row>
      <Row label="Grafemas Ganados (total)">
        <span className="settings__readout">₲ {fmt(profile.stats.totalGrafemasEarned)}</span>
      </Row>
      <Row label="Grafemas Gastados (total)">
        <span className="settings__readout">₲ {fmt(profile.stats.totalGrafemasSpent)}</span>
      </Row>
      <Row label="Tutoriales" hint="Vuelve a mostrar los tutoriales de Combate, Carrera y Hangar">
        <button
          type="button"
          className="settings__reset"
          onClick={() => { resetTutorialFlags(); Bridge.commands.resetTutorials(); }}
        >
          Repetir tutoriales
        </button>
      </Row>
      <Row label="Mecanografía" hint="Repaso de postura y dedos">
        <button
          type="button"
          className="settings__reset"
          onClick={() => Bridge.commands.startTutorial('typing')}
        >
          Ver tutorial de mecanografía
        </button>
      </Row>

      <div className="settings__danger-zone">
        <p className="settings__danger-note">
          ◈ Reiniciar el perfil borra grafemas, inventario y estadísticas. Acción irreversible.
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
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings({ onClose }) {
  const [tab, setTab] = useState('visuals');
  const [s, setS] = useState(loadSettings);

  // Push 'modal' scope mientras Settings está montado.
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

  const set = useCallback((section, key, val) => {
    setS(prev => {
      const next = { ...prev, [section]: { ...prev[section], [key]: val } };
      saveSettings(next);
      if (section === 'protocol' && key === 'executionMode') {
        workerBridge.setMode(val);
        window.dispatchEvent(new CustomEvent('babel:executionMode', { detail: val }));
      }
      return next;
    });
  }, []);

  const handleReset = () => {
    saveSettings(DEFAULT_SETTINGS);
    setS(DEFAULT_SETTINGS);
  };

  return (
    <div className="settings">
      <div className="settings__panel">
        <span className="settings__scan" aria-hidden="true" />

        {/* Header */}
        <div className="settings__header">
          <div className="settings__header-left">
            <span className="settings__header-label">◈ CONFIGURACIÓN DE SISTEMA · BABEL NRX</span>
            <h2 className="settings__title">Ajustes</h2>
          </div>
          <button type="button" className="settings__close" onClick={onClose} aria-label="Cerrar">
            ✕
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

          {tab === 'visuals' && (
            <div className="settings__section" key="visuals">
              <Row label="Calidad de Renderizado" hint="Nivel de detalle visual global">
                <SciSelect
                  options={QUALITY_OPTS}
                  value={s.visuals.quality}
                  onChange={v => set('visuals', 'quality', v)}
                />
              </Row>
              <Row label="Sombras Dinámicas" hint="Impacto en rendimiento: moderado">
                <SciToggle value={s.visuals.shadows} onChange={v => set('visuals', 'shadows', v)} />
              </Row>
              <Row label="Post-Procesado" hint="Bloom, aberración cromática, viñeta">
                <SciToggle value={s.visuals.postProcessing} onChange={v => set('visuals', 'postProcessing', v)} />
              </Row>
              <Row label="Densidad de Partículas" hint="Efectos de propulsión y explosiones">
                <SciSlider
                  value={s.visuals.particleDensity}
                  onChange={v => set('visuals', 'particleDensity', v)}
                  unit="%"
                />
              </Row>
              <Row label="Destellos de Pantalla" hint="Flashes al recibir daño o eventos críticos">
                <SciToggle value={s.visuals.screenFlash} onChange={v => set('visuals', 'screenFlash', v)} />
              </Row>
              <Row label="Vibración de Cámara" hint="Sacudida al impacto o muerte de nave">
                <SciToggle value={s.visuals.cameraShake} onChange={v => set('visuals', 'cameraShake', v)} />
              </Row>
            </div>
          )}

          {tab === 'audio' && (
            <div className="settings__section" key="audio">
              <Row label="Efectos de Sonido" hint="Disparos, explosiones, impactos lexicales">
                <SciSlider
                  value={s.audio.sfx}
                  onChange={v => set('audio', 'sfx', v)}
                  unit="%"
                />
              </Row>
              <Row label="Música" hint="Banda sonora ambiental del combate">
                <SciSlider
                  value={s.audio.music}
                  onChange={v => set('audio', 'music', v)}
                  unit="%"
                />
              </Row>
              <Row label="Comunicaciones" hint="Narraciones y transmisiones de voz">
                <SciSlider
                  value={s.audio.voices}
                  onChange={v => set('audio', 'voices', v)}
                  unit="%"
                />
              </Row>
            </div>
          )}

          {tab === 'profile'  && <ProfileSection />}
          {tab === 'controls' && <ControlsSection />}

          {tab === 'protocol' && (
            <div className="settings__section" key="protocol">
              <Row label="Dificultad Léxica" hint="Complejidad y longitud del vocabulario enemigo">
                <SciSelect
                  options={DIFFICULTY_OPTS}
                  value={s.protocol.lexicalDifficulty}
                  onChange={v => set('protocol', 'lexicalDifficulty', v)}
                />
              </Row>
              <Row label="Velocidad de Palabras" hint="Tiempo de exposición por objetivo activo">
                <SciSlider
                  value={s.protocol.wordSpeed}
                  min={10}
                  max={100}
                  onChange={v => set('protocol', 'wordSpeed', v)}
                  unit="%"
                />
              </Row>
              <Row label="Repetición Automática" hint="Repite palabras fallidas al final de oleada">
                <SciToggle value={s.protocol.autoRepeat} onChange={v => set('protocol', 'autoRepeat', v)} />
              </Row>
              <Row label="Mostrar Fonética" hint="Transcripción fonética bajo cada palabra">
                <SciToggle value={s.protocol.showPhonetics} onChange={v => set('protocol', 'showPhonetics', v)} />
              </Row>
              <Row label="Modo de Procesamiento Léxico" hint="Normal: main thread · Paralelo: Web Worker (descarga el frame)">
                <SciSelect
                  options={[
                    { value: EXECUTION_MODE.NORMAL,   label: 'Normal' },
                    { value: EXECUTION_MODE.PARALLEL, label: 'Paralelo (WW)' },
                  ]}
                  value={s.protocol.executionMode}
                  onChange={v => set('protocol', 'executionMode', v)}
                />
              </Row>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="settings__footer">
          <span className="settings__footer-note">◈ Los cambios se aplican y guardan automáticamente</span>
          <button type="button" className="settings__reset" onClick={handleReset}>
            Restaurar Valores
          </button>
        </div>

      </div>
    </div>
  );
}
