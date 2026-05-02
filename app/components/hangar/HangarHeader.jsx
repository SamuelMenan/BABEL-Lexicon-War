import React from 'react';

export default function HangarHeader({ ship }) {
  return (
    <div className="hangar-header">
      <div className="hangar-header__left">
        <span className="hangar-header__session">SESIÓN · 01</span>
        <span className="hangar-header__context">hangar · orbital</span>
      </div>

      <div className="hangar-header__center">
        <span className="hangar-header__code">· {ship.code} ·</span>
      </div>

      <div className="hangar-header__right">
        <span className="hangar-header__pilot">KAEL · VOSS</span>
        <span className="hangar-header__pilot-id">TYPO-07 / PILOT</span>
      </div>
    </div>
  );
}
