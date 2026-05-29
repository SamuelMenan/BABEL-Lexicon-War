import React from 'react';
import useTranslation from '../../../shared/i18n/useTranslation.js';

function StatRow({ label, value, max = 10 }) {
  const pct = (value / max) * 100;
  return (
    <div className="hangar-stats__row">
      <div className="hangar-stats__row-top">
        <span className="hangar-stats__label">{label}</span>
        <span className="hangar-stats__value">{String(value).padStart(2, '0')} / {max}</span>
      </div>
      <div className="hangar-stats__bar-track">
        <div className="hangar-stats__bar-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

export default function ShipStats({ coreId, stats }) {
  const { t } = useTranslation();

  const STAT_LABELS = {
    velocidad: t('hangar.stats.speed'),
    escudo:    t('hangar.stats.shield'),
    precision: t('hangar.stats.accuracy'),
    capacidad: t('hangar.stats.capacity'),
  };

  return (
    <div className="hangar-stats">
      <div className="hangar-stats__header">
        <span className="hangar-stats__title">{t('hangar.stats.title')}</span>
        <span className="hangar-stats__core">{coreId}</span>
      </div>
      <div className="hangar-stats__divider" />
      {Object.entries(STAT_LABELS).map(([key, label]) => (
        <StatRow key={key} label={label} value={stats[key] ?? 0} />
      ))}
    </div>
  );
}
