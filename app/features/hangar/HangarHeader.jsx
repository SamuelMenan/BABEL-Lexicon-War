import React from 'react';
import WalletBadge from '../hud/WalletBadge.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';

// `rivalCharacter`: en modo online muestra info del rival debajo del propio.
// En modo single (default) no se renderiza la segunda linea.
export default function HangarHeader({ ship, character, rivalCharacter = null }) {
  const { t } = useTranslation();
  const pilotName = (character?.name || t('hangar.pilot')).toUpperCase();
  const pilotCode = character?.codename || '—';
  const pilotRole = character?.role || t('hangar.pilotRoleDefault');
  const rivalName = rivalCharacter ? (rivalCharacter.name || '—').toUpperCase() : null;
  const rivalCode = rivalCharacter?.codename || '—';
  const rivalRole = rivalCharacter?.role || t('hangar.pilotRoleDefault');

  return (
    <>
      <div className="hangar-header">
        <div className="hangar-header__left">
          <span className="hangar-header__pilot">{pilotName}</span>
          <span className="hangar-header__pilot-id">{pilotCode} / {pilotRole.toUpperCase()}</span>
          <span className="hangar-header__pilot-ship">{t('hangar.ship')} · {ship?.name?.toUpperCase() || '—'}</span>
          {rivalCharacter && (
            <>
              <span className="hangar-header__divider">— {t('hangar.rival')} —</span>
              <span className="hangar-header__pilot hangar-header__pilot--rival">{rivalName}</span>
              <span className="hangar-header__pilot-id">{rivalCode} / {rivalRole.toUpperCase()}</span>
            </>
          )}
          {!rivalCharacter && (
            <span className="hangar-header__session">{t('hangar.orbitalSession')}</span>
          )}
        </div>

        <div className="hangar-header__center">
          <span className="hangar-header__code">· {ship.code} ·</span>
        </div>
      </div>
      <WalletBadge placement="hangar" />
    </>
  );
}
