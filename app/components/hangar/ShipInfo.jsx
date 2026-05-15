import React from 'react';

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES');
function fmt(n) { return NUMBER_FORMATTER.format(n ?? 0); }

export default function ShipInfo({ ship, coreId, owned, equipped, price }) {
  let badge;
  if (equipped)    badge = <span className="hangar-title__badge hangar-title__badge--equipped">EQUIPADA</span>;
  else if (owned)  badge = <span className="hangar-title__badge hangar-title__badge--owned">EN HANGAR</span>;
  else             badge = <span className="hangar-title__badge hangar-title__badge--locked">₲ {fmt(price)}</span>;

  return (
    <div className="hangar-title">
      <h2 className="hangar-title__name">{ship.name.toUpperCase()}</h2>
      <div className="hangar-title__meta">
        <span>PROGRAMA TYPO</span>
        <span className="hangar-title__diamond">◆</span>
        {badge}
        <span className="hangar-title__diamond">◆</span>
        <span>CORE · {coreId}</span>
      </div>
    </div>
  );
}
