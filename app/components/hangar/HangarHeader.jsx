import React from 'react';
import WalletBadge from '../hud/WalletBadge.jsx';

export default function HangarHeader({ ship, character }) {
  const pilotName = (character?.name || 'PILOTO').toUpperCase();
  const pilotCode = character?.codename || '—';
  const pilotRole = character?.role || 'PILOT';
  return (
    <>
      <div className="hangar-header">
        <div className="hangar-header__left">
          <span className="hangar-header__pilot">{pilotName}</span>
          <span className="hangar-header__pilot-id">{pilotCode} / {pilotRole.toUpperCase()}</span>
          <span className="hangar-header__pilot-ship">NAVE · {ship?.name?.toUpperCase() || '—'}</span>
          <span className="hangar-header__session">SESIÓN · 01 · hangar · orbital</span>
        </div>

        <div className="hangar-header__center">
          <span className="hangar-header__code">· {ship.code} ·</span>
        </div>
      </div>
      <WalletBadge placement="hangar" />
    </>
  );
}
