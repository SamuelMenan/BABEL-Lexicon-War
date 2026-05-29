import React, { useEffect } from 'react';
import { getCharacter } from '@shared/data/characterData.js';
import { KeybindService } from '@shared/services/keybindService.js';
import KeyHint from '@app/ui/KeyHint.jsx';
import Icon from '@app/ui/Icon.jsx';
import Modal from '@app/ui/Modal.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';

// Modal welcome al entrar al OnlineRoomHangar — muestra piloto asignado al
// jugador + rival, con portraits y estilo coherente con CharacterSelectModal
// del hangar single. Pilot info persistente vive en HangarHeader (top-left),
// no banner top-center.
//
// Props:
//   myPilot     — 'kael' | 'voss'
//   rivalPilot  — 'kael' | 'voss'
//   onDismiss   — () => void
//   showWelcome — bool
export default function OnlinePilotBadge({ myPilot, rivalPilot, onDismiss, showWelcome }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!showWelcome) return;
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => onDismiss?.());
    return () => { offConfirm(); };
  }, [showWelcome, onDismiss]);

  if (!showWelcome) return null;
  const me    = getCharacter(myPilot)    || {};
  const rival = getCharacter(rivalPilot) || {};
  return (
    <Modal
      className="char-modal char-modal--online"
      panelClassName="char-modal__panel"
      onClose={onDismiss}
    >
      <div className="char-modal__header">
        <span className="char-modal__label">{t('race.pilotBadge.label')}</span>
      </div>

      <h3 className="char-modal__title">{t('race.pilotBadge.title')}</h3>

      <div className="char-modal__notice" role="note">
        <Icon name="info" size={16} />
        <div className="char-modal__notice-text">
          <strong>{t('race.pilotBadge.autoTag')}</strong>
          <span>{t('race.pilotBadge.autoDesc')}</span>
        </div>
      </div>

      <div className="char-modal__grid">
        <PilotCard char={me}    label={t('race.pilotBadge.you')} highlight="me"    chosen />
        <PilotCard char={rival} label={t('race.pilotBadge.rival')} highlight="rival" chosen={false} />
      </div>

      <div className="char-modal__actions">
        <KeyHint
          className="char-modal__hint"
          items={[{ key: '↵', label: t('race.hangarExtra.continueHint') }]}
        />
        <button type="button"
          className="char-modal__btn char-modal__btn--confirm"
          onClick={onDismiss}
          autoFocus
        >{t('race.pilotBadge.continue')}</button>
      </div>
    </Modal>
  );
}

function PilotCard({ char, label, highlight, chosen }) {
  // TU → portraitChosen (elegido). RIVAL → portrait base (no elegido).
  const portrait = chosen ? (char.portraitChosen || char.portrait) : (char.portrait || char.portraitChosen);
  return (
    <div className={`char-card char-card--readonly char-card--${highlight}`}>
      <div className="char-card__portrait-wrap">
        <img
          className="char-card__portrait"
          src={portrait}
          alt={char.name || '—'}
          draggable="false"
        />
        <div className="char-card__brackets">
          <span className="char-card__bracket char-card__bracket--tl" />
          <span className="char-card__bracket char-card__bracket--tr" />
          <span className="char-card__bracket char-card__bracket--bl" />
          <span className="char-card__bracket char-card__bracket--br" />
        </div>
        <span className={`char-card__badge char-card__badge--${highlight}`}>{label}</span>
      </div>
      <div className="char-card__meta">
        <span className="char-card__name">{(char.name || '—').toUpperCase()}</span>
        <span className="char-card__code">{char.codename || '—'} · {char.role || '—'}</span>
        <p className="char-card__bio">{char.bio || ''}</p>
      </div>
    </div>
  );
}
