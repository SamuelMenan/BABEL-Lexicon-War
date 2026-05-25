import React, { useEffect } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import KeyHint from '../common/KeyHint.jsx';
import Icon from '../common/Icon.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';
import { playSfx, playBgm, getCurrentBgmKey } from '../../../shared/audioManager.js';

// Escena de creditos — full-screen modal con secciones por rol del equipo y
// agradecimientos especiales. Los nombres son placeholders; reemplazar con
// los datos del equipo real. Estructura tipo film credits, scroll vertical.
//
// Props:
//   onClose — () => void
export default function CreditsModal({ onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    KeybindService.pushScope('modal');
    const off = KeybindService.register('modal', 'CANCEL', () => onClose?.());
    return () => { off(); KeybindService.popScope('modal'); };
  }, [onClose]);

  useEffect(() => { playSfx('modal.open'); return () => playSfx('modal.close'); }, []);

  useEffect(() => {
    const prev = getCurrentBgmKey();
    playBgm('bgm.credits');
    return () => { playBgm(prev || 'bgm.main_menu'); };
  }, []);

  return (
    <div className="credits" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="credits__panel" onClick={(e) => e.stopPropagation()}>
        <header className="credits__header">
          <span className="credits__label">{t('credits.label')}</span>
          <button
            type="button"
            className="credits__close"
            onClick={onClose}
            aria-label={t('common.close')}
          ><Icon name="close" size={16} /></button>
        </header>

        <div className="credits__scroll">
          <div className="credits__intro">
            {/* Reusa estilo chrome + glitch del MainMenu para coherencia. */}
            <h1 className="main-menu__title credits__title" data-text="BABEL">BABEL:</h1>
            <p className="credits__subtitle">Lexicon War</p>
            <div className="credits__divider" />
          </div>

          {/* ── Equipo ───────────────────────────────────────── */}
          <Section title={t('credits.sections.team')}>
            <Role label={t('credits.roles.direction')} names={[t('creditsExtra.names.lead')]} />
            <Role label={t('credits.roles.design')}     names={[t('creditsExtra.names.lead')]} />
            <Role label={t('credits.roles.programming')}        names={[t('creditsExtra.names.team')]} />
            <Role label={t('credits.roles.ui')}      names={[t('creditsExtra.names.team')]} />
            <Role label={t('credits.roles.audio')}         names={[t('creditsExtra.names.team')]} />
            <Role label={t('credits.roles.narrative')}           names={[t('creditsExtra.names.team')]} />
            <Role label={t('credits.roles.qa')}        names={[t('creditsExtra.names.team')]} />
          </Section>

          {/* ── Tecnologia ──────────────────────────────────── */}
          <Section title={t('credits.sections.stack')}>
            <Role label={t('credits.roles.engine')}        names={['Three.js']} />
            <Role label={t('credits.roles.frontend')}     names={['React · Vite']} />
            <Role label={t('credits.roles.backend')}      names={['Supabase · Postgres · Realtime']} />
            <Role label={t('credits.roles.language')}     names={['JavaScript ES2022']} />
          </Section>

          {/* ── Agradecimientos especiales ──────────────────── */}
          <Section title={t('credits.sections.thanks')}>
            <NameList names={[
              'Santiago Bustos Lopez',
              'Nicolas Alejandro Bastidas Calvache',
              'Julio Esteban Bolaños Benavides',
              'Juan David Burbano',
              'Michael David Lagos Rosero',
            ]} />
          </Section>

          {/* ── Cierre ──────────────────────────────────────── */}
          <div className="credits__outro">
            <div className="credits__divider" />
            <p className="credits__quote">
              {t('credits.quote')}
            </p>
            <p className="credits__copy">
              © {new Date().getFullYear()} BABEL · LEXICON WAR
            </p>
            <p className="credits__build">{t('credits.build')}</p>
          </div>
        </div>

        <footer className="credits__footer">
          <KeyHint
            className="credits__hint"
            items={[{ key: 'ESC', label: t('auth.closeKey') }]}
          />
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="credits__section">
      <h2 className="credits__section-title">{title}</h2>
      <div className="credits__section-body">{children}</div>
    </section>
  );
}

// Normaliza names: acepta array de strings o strings con comas. Cada entry
// puede contener "A, B, C" → se expande a 3 nombres separados. Util para
// pegar listas directamente sin tener que separarlas a mano en JSX.
function normalizeNames(names) {
  return names
    .flatMap((n) => (typeof n === 'string' ? n.split(/\s*,\s*/) : []))
    .map((n) => n.trim())
    .filter(Boolean);
}

// Role con label + 1..N nombres. Nombres se apilan verticalmente, cada uno
// en su propia linea, todos con misma jerarquia visual que el primero.
// Ej: <Role label="Programacion" names={['Ana', 'Bruno', 'Cesar']} />
//     <Role label="QA" names={['Ana, Bruno, Cesar']} />  // tambien valido
function Role({ label, names = [] }) {
  const list = normalizeNames(names);
  if (list.length === 0) return null;
  return (
    <div className="credits__role">
      <span className="credits__role-label">{label}</span>
      <div className="credits__role-names">
        {list.map((n, i) => (
          <span key={i} className="credits__role-name">{n}</span>
        ))}
      </div>
    </div>
  );
}

// Lista de nombres centrada sin label — para secciones tipo "Agradecimientos"
// donde el rol no aplica. Cada nombre en su propia linea.
function NameList({ names = [] }) {
  const list = normalizeNames(names);
  if (list.length === 0) return null;
  return (
    <ul className="credits__name-list">
      {list.map((n, i) => (
        <li key={i} className="credits__name-list-item">{n}</li>
      ))}
    </ul>
  );
}
