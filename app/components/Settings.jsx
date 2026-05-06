import React, { useState, useCallback } from "react";

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
  },
};

function loadSettings() {
  try {
    const raw = localStorage.getItem('babel-settings');
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
  try { localStorage.setItem('babel-settings', JSON.stringify(s)); } catch { /* ignore */ }
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

export default function Settings({ onClose }) {
  const [tab, setTab] = useState('visuals');
  const [s, setS] = useState(loadSettings);

  const set = useCallback((section, key, val) => {
    setS(prev => {
      const next = { ...prev, [section]: { ...prev[section], [key]: val } };
      saveSettings(next);
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
            <span className="settings__header-label">◈ CONFIGURACIÓN DE SISTEMA — BABEL NRX</span>
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
