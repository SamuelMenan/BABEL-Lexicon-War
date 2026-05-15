import React from 'react';

function WeaponSlot({ name, slot, locked }) {
  return (
    <div className={`hangar-arsenal__slot${locked ? ' hangar-arsenal__slot--locked' : ''}`}>
      <span className="hangar-arsenal__weapon-name">
        {locked ? '[ bloqueado ]' : name}
      </span>
      <span className="hangar-arsenal__slot-id">{slot}</span>
    </div>
  );
}

export default function ShipArsenal({ arsenal }) {
  const count = arsenal.filter(w => !w.locked).length;
  return (
    <div className="hangar-arsenal">
      <div className="hangar-arsenal__header">
        <span className="hangar-arsenal__title">ARSENAL · LÉXICO</span>
        <span className="hangar-arsenal__count">{String(count).padStart(2, '0')}</span>
      </div>
      <div className="hangar-arsenal__divider" />
      {arsenal.map((weapon, i) => (
        <WeaponSlot key={`${weapon.name ?? 'slot'}-${i}`} {...weapon} />
      ))}
    </div>
  );
}
