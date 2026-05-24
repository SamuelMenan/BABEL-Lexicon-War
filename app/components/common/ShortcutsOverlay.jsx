// Modal de atajos. Trigger: tecla '?'. Lista acciones aplicables al scope activo.

import React, { useEffect, useState } from 'react';
import { ACTIONS, actionsForScope } from '../../../shared/keybindings.js';
import { KeybindService } from '../../../shared/keybindService.js';
import '../../../styles/components/shortcuts-overlay.css';

const SCOPE_LABELS = {
  global:   'Globales',
  menu:     'Menu',
  hangar:   'Hangar',
  gameplay: 'Juego',
  tutorial: 'Tutorial',
  modal:    'Modal',
};

function KeyChip({ value }) {
  return <span className="shortcuts__key">{formatKey(value)}</span>;
}

function formatKey(k) {
  if (!k) return '—';
  if (k === ' ')        return 'Space';
  if (k === 'ArrowUp')  return '↑';
  if (k === 'ArrowDown')return '↓';
  if (k === 'ArrowLeft')return '←';
  if (k === 'ArrowRight')return '→';
  return k.length === 1 ? k.toUpperCase() : k;
}

export default function ShortcutsOverlay({ open, onClose }) {
  const [scopes, setScopes] = useState(() => KeybindService.getScopes());
  const debugOn = KeybindService.isDebugEnabled();

  useEffect(() => {
    if (!open) return;
    setScopes(KeybindService.getScopes());
    function onKey(e) {
      if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); onClose?.(); }
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open, onClose]);

  if (!open) return null;

  // Recolectar acciones para cada scope del stack (sin duplicar).
  const seen = new Set();
  const sections = scopes.slice().reverse().map((scope) => {
    const ids = actionsForScope(scope, { includeDebug: debugOn })
      .filter((id) => !seen.has(id));
    ids.forEach((id) => seen.add(id));
    return { scope, ids };
  }).filter((s) => s.ids.length > 0);

  return (
    <div className="shortcuts" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="shortcuts__panel" onClick={(e) => e.stopPropagation()}>
        <header className="shortcuts__header">
          <span className="shortcuts__chip">ATAJOS</span>
          <button className="shortcuts__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="shortcuts__body">
          {sections.map(({ scope, ids }) => (
            <section key={scope} className="shortcuts__section">
              <h3 className="shortcuts__section-title">{SCOPE_LABELS[scope] || scope}</h3>
              <ul className="shortcuts__list">
                {ids.map((id) => {
                  const def = ACTIONS[id];
                  const binding = KeybindService.getBinding(id);
                  return (
                    <li key={id} className={`shortcuts__row${def.debug ? ' shortcuts__row--debug' : ''}`}>
                      <span className="shortcuts__desc">{def.description}</span>
                      <span className="shortcuts__keys">
                        <KeyChip value={binding?.key} />
                        {binding?.alias && <KeyChip value={binding.alias} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="shortcuts__footer">
          <span>Pulsa <KeyChip value="?" /> u <KeyChip value="Escape" /> para cerrar</span>
        </footer>
      </div>
    </div>
  );
}
