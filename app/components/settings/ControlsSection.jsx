import React, { useEffect, useState, useCallback } from 'react';
import { ACTIONS, SCOPES } from '../../../shared/keybindings.js';
import { KeybindService } from '../../../shared/keybindService.js';
import { EconomySystem } from '../../../game/systems/EconomySystem.js';

const SCOPE_ORDER = [
  { id: 'global',   label: 'Globales' },
  { id: 'menu',     label: 'Menu' },
  { id: 'hangar',   label: 'Hangar' },
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'modal',    label: 'Modal' },
  { id: 'gameplay', label: 'Juego' },
];

function formatKey(k) {
  if (!k) return '—';
  if (k === ' ')          return 'Space';
  if (k === 'ArrowUp')    return '↑';
  if (k === 'ArrowDown')  return '↓';
  if (k === 'ArrowLeft')  return '←';
  if (k === 'ArrowRight') return '→';
  return k.length === 1 ? k.toUpperCase() : k;
}

function groupActionsByScope(includeDebug) {
  const groups = {};
  for (const [id, def] of Object.entries(ACTIONS)) {
    if (def.debug && !includeDebug) continue;
    const primary = def.scopes.includes('*') ? 'global' : def.scopes[0];
    if (!groups[primary]) groups[primary] = [];
    groups[primary].push(id);
  }
  return groups;
}

export default function ControlsSection() {
  const [profile, setProfile] = useState(() => EconomySystem.getProfile());
  const [rebindingId, setRebindingId] = useState(null);

  const refresh = useCallback(() => setProfile(EconomySystem.getProfile()), []);
  const debugOn = !!profile.debugEnabled;

  // Captura siguiente tecla para rebind.
  useEffect(() => {
    if (!rebindingId) return;
    function onKey(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setRebindingId(null); return; }
      const key = e.key;
      EconomySystem.setKeybindOverride(rebindingId, key);
      KeybindService.setOverrides(EconomySystem.getProfile().keybindOverrides || {});
      refresh();
      setRebindingId(null);
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [rebindingId, refresh]);

  const groups = groupActionsByScope(debugOn);

  const onToggleDebug = (e) => {
    const next = e.target.checked;
    EconomySystem.setDebugEnabled(next);
    KeybindService.setDebugEnabled(next);
    refresh();
  };

  const onReset = () => {
    EconomySystem.resetKeybindOverrides();
    KeybindService.setOverrides({});
    refresh();
  };

  const onClear = (id) => {
    EconomySystem.clearKeybindOverride(id);
    KeybindService.setOverrides(EconomySystem.getProfile().keybindOverrides || {});
    refresh();
  };

  return (
    <div className="settings__section" key="controls">
      <div className="settings__row">
        <div className="settings__row-meta">
          <span className="settings__row-label">Modo desarrollador</span>
          <span className="settings__row-hint">Habilita teclas debug (F9, F10, F11, etc.)</span>
        </div>
        <div className="settings__row-control">
          <label className="settings__toggle-label-wrap">
            <input type="checkbox" checked={debugOn} onChange={onToggleDebug} />
            <span>{debugOn ? 'ON' : 'OFF'}</span>
          </label>
        </div>
      </div>

      <div className="settings__row">
        <div className="settings__row-meta">
          <span className="settings__row-label">Restaurar atajos</span>
          <span className="settings__row-hint">Vuelve todos los bindings a sus valores por defecto</span>
        </div>
        <div className="settings__row-control">
          <button type="button" className="settings__reset" onClick={onReset}>
            Restaurar
          </button>
        </div>
      </div>

      {SCOPE_ORDER.map(({ id: scope, label }) => {
        const ids = groups[scope];
        if (!ids || ids.length === 0) return null;
        return (
          <div key={scope} className="ctrl-group">
            <h3 className="ctrl-group__title">{label}</h3>
            <ul className="ctrl-list">
              {ids.map((actionId) => {
                const def = ACTIONS[actionId];
                const binding = KeybindService.getBinding(actionId);
                const overridden = profile.keybindOverrides?.[actionId] != null;
                const rebinding = rebindingId === actionId;
                return (
                  <li key={actionId} className={`ctrl-row${def.debug ? ' ctrl-row--debug' : ''}`}>
                    <span className="ctrl-row__desc">{def.description}</span>
                    <span className="ctrl-row__keys">
                      <span className="ctrl-row__key">
                        {rebinding ? 'PULSA TECLA…' : formatKey(binding?.key)}
                      </span>
                      {binding?.alias && !rebinding && (
                        <span className="ctrl-row__key ctrl-row__key--alias">{formatKey(binding.alias)}</span>
                      )}
                    </span>
                    <span className="ctrl-row__actions">
                      <button
                        type="button"
                        className="ctrl-row__btn"
                        onClick={() => setRebindingId(rebinding ? null : actionId)}
                      >
                        {rebinding ? 'Cancelar' : 'Cambiar'}
                      </button>
                      {overridden && !rebinding && (
                        <button
                          type="button"
                          className="ctrl-row__btn ctrl-row__btn--ghost"
                          onClick={() => onClear(actionId)}
                        >
                          ⟲
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
