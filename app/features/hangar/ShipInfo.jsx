import React from 'react';
import useTranslation from '@shared/i18n/useTranslation.js';
import { getNumberFormatter } from '@shared/i18n/index.js';

export default function ShipInfo({ ship, coreId, owned, equipped, price }) {
  const { t } = useTranslation();
  const formatter = getNumberFormatter();

  const fmt = (n) => formatter.format(n ?? 0);

  let badge;
  if (equipped)    badge = <span className="hangar-title__badge hangar-title__badge--equipped">{t('hangar.status.equipped')}</span>;
  else if (owned)  badge = <span className="hangar-title__badge hangar-title__badge--owned">{t('hangar.status.owned')}</span>;
  else             badge = <span className="hangar-title__badge hangar-title__badge--locked">₲ {fmt(price)}</span>;

  return (
    <div className="hangar-title">
      <h2 className="hangar-title__name">{ship.name.toUpperCase()}</h2>
      <div className="hangar-title__meta">
        <span>{t('hangar.programTypo')}</span>
        <span className="hangar-title__diamond">◆</span>
        {badge}
        <span className="hangar-title__diamond">◆</span>
        <span>CORE · {coreId}</span>
      </div>
    </div>
  );
}
