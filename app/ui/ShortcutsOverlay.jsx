import React, { useEffect, useState } from 'react';
import { ACTIONS, actionsForScope } from '@shared/config/keybindings.js';
import { KeybindService } from '@shared/services/keybindService.js';
import Icon from './Icon.jsx';
import Modal from '@app/ui/Modal.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';
import '../../styles/ui/shortcuts-overlay.css';

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
  const { t } = useTranslation();
  const [scopes, setScopes] = useState(() => KeybindService.getScopes());
  const debugOn = KeybindService.isDebugEnabled();

  useEffect(() => {
    if (!open) return;
    setScopes(KeybindService.getScopes());
    const offShowHelp = KeybindService.register('modal', 'SHOW_HELP', () => { onClose?.(); return true; });
    return () => { offShowHelp(); };
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
    <Modal
      className="shortcuts"
      panelClassName="shortcuts__panel"
      onClose={onClose}
    >
      <header className="shortcuts__header">
        <span className="shortcuts__chip">{t('shortcuts.title')}</span>
        <button type="button" className="shortcuts__close" onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={16} /></button>
      </header>

      <div className="shortcuts__body">
        {sections.map(({ scope, ids }) => (
          <section key={scope} className="shortcuts__section">
            <h3 className="shortcuts__section-title">{t(`shortcuts.scopes.${scope}`)}</h3>
            <ul className="shortcuts__list">
              {ids.map((id) => {
                const def = ACTIONS[id];
                const binding = KeybindService.getBinding(id);
                return (
                  <li key={id} className={`shortcuts__row${def.debug ? ' shortcuts__row--debug' : ''}`}>
                    <span className="shortcuts__desc">{t(def.description)}</span>
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
        <span><KeyChip value="?" /> / <KeyChip value="Escape" /> · {t('shortcuts.closeHint')}</span>
      </footer>
    </Modal>
  );
}
