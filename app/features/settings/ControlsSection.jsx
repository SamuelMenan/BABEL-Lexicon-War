import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ACTIONS, SCOPES } from '@shared/config/keybindings.js';
import { KeybindService } from '@shared/services/keybindService.js';
import { EconomySystem } from '@game/domains/economy/EconomySystem.js';
import useTranslation from '@shared/i18n/useTranslation.js';
import KeyboardNavigable from '@app/ui/KeyboardNavigable.jsx';

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
  const { t } = useTranslation();
  const [profile, setProfile] = useState(() => EconomySystem.getProfile());
  const [rebindingId, setRebindingId] = useState(null);

  const SCOPE_ORDER = [
    { id: 'global',   label: t('settings.controls.scopes.global') },
    { id: 'menu',     label: t('settings.controls.scopes.menu') },
    { id: 'hangar',   label: t('settings.controls.scopes.hangar') },
    { id: 'tutorial', label: t('settings.controls.scopes.tutorial') },
    { id: 'modal',    label: t('settings.controls.scopes.modal') },
    { id: 'gameplay', label: t('settings.controls.scopes.gameplay') },
  ];

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
          <span className="settings__row-label">{t('settings.controls.devMode')}</span>
          <span className="settings__row-hint">{t('settings.controls.devModeHint')}</span>
        </div>
        <div className="settings__row-control">
          <label className="settings__toggle-label-wrap">
            <input type="checkbox" checked={debugOn} onChange={onToggleDebug} />
            <span>{debugOn ? t('settings.controls.on') : t('settings.controls.off')}</span>
          </label>
        </div>
      </div>

      <div className="settings__row">
        <div className="settings__row-meta">
          <span className="settings__row-label">{t('settings.controls.restoreShortcuts')}</span>
          <span className="settings__row-hint">{t('settings.controls.restoreShortcutsHint')}</span>
        </div>
        <div className="settings__row-control">
          <button type="button" className="settings__reset" onClick={onReset}>
            {t('settings.controls.restore')}
          </button>
        </div>
      </div>

      {SCOPE_ORDER.map(({ id: scope, label }) => {
        const ids = groups[scope];
        if (!ids || ids.length === 0) return null;
        return (
          <div key={scope} className="ctrl-group">
            <h3 className="ctrl-group__title">{label}</h3>
            <KeyboardNavigable
              items={ids}
              orientation="vertical"
              autoFocus={false}
              allowNumberJump={false}
              className="ctrl-list ctrl-list--kbnav"
              onActivate={(actionId) => {
                setRebindingId(prev => (prev === actionId ? null : actionId));
              }}
              onCancel={() => setRebindingId(null)}
            >
              {(actionId, ctx) => {
                const def = ACTIONS[actionId];
                const binding = KeybindService.getBinding(actionId);
                const overridden = profile.keybindOverrides?.[actionId] != null;
                const rebinding = rebindingId === actionId;
                return (
                  <div
                    key={actionId}
                    className={`ctrl-row${def.debug ? ' ctrl-row--debug' : ''}${ctx.focused ? ' ctrl-row--focused' : ''}`}
                  >
                    <span className="ctrl-row__desc">{t(def.description)}</span>
                    <span className="ctrl-row__keys">
                      <span className="ctrl-row__key">
                        {rebinding ? t('settings.controls.pressKey') : formatKey(binding?.key)}
                      </span>
                      {binding?.alias && !rebinding && (
                        <span className="ctrl-row__key ctrl-row__key--alias">{formatKey(binding.alias)}</span>
                      )}
                    </span>
                    <span className="ctrl-row__actions">
                      <button
                        type="button"
                        className="ctrl-row__btn"
                        onClick={() => { ctx.setFocus(); setRebindingId(rebinding ? null : actionId); }}
                      >
                        {rebinding ? t('settings.controls.cancel') : t('settings.controls.change')}
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
                  </div>
                );
              }}
            </KeyboardNavigable>
          </div>
        );
      })}
    </div>
  );
}
