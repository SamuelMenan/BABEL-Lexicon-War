import React from 'react';

export default function ShipInfo({ ship, coreId }) {
  return (
    <div className="hangar-title">
      <h2 className="hangar-title__name">{ship.name.toUpperCase()}</h2>
      <div className="hangar-title__meta">
        <span>PROGRAMA TYPO</span>
        <span className="hangar-title__diamond">◆</span>
        <span>UNIDAD NO CLASIFICADA</span>
        <span className="hangar-title__diamond">◆</span>
        <span>CORE · {coreId}</span>
      </div>
    </div>
  );
}
