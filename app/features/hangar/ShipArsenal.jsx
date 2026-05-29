import React from 'react';
import useTranslation from '@shared/i18n/useTranslation.js';

function WeaponSlot({ name, slot, locked, t }) {
  return (
    <div className={`hangar-arsenal__slot${locked ? ' hangar-arsenal__slot--locked' : ''}`}>
      <span className="hangar-arsenal__weapon-name">
        {locked ? t('hangar.arsenal.locked') : name}
      </span>
      <span className="hangar-arsenal__slot-id">{slot}</span>
    </div>
  );
}

export default function ShipArsenal({ arsenal }) {
  const { t } = useTranslation();
  const count = arsenal.filter(w => !w.locked).length;
  return (
    <div className="hangar-arsenal">
      <div className="hangar-arsenal__header">
        <span className="hangar-arsenal__title">{t('hangar.arsenal.title')}</span>
        <span className="hangar-arsenal__count">{String(count).padStart(2, '0')}</span>
      </div>
      <div className="hangar-arsenal__divider" />
      {arsenal.map((weapon, i) => (
        <WeaponSlot key={`${weapon.name ?? 'slot'}-${i}`} {...weapon} t={t} />
      ))}
    </div>
  );
}
