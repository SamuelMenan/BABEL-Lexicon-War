import React from 'react';

const STAT_LABELS = {
  velocidad: 'VELOCIDAD',
  escudo:    'ESCUDO·LEXICO',
  precision: 'PRECISION',
  capacidad: 'LEX·CAPACIDAD',
};

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
  return (
    <div className="hangar-stats">
      <div className="hangar-stats__header">
        <span className="hangar-stats__title">ESPECIFICACIONES</span>
        <span className="hangar-stats__core">{coreId}</span>
      </div>
      <div className="hangar-stats__divider" />
      {Object.entries(STAT_LABELS).map(([key, label]) => (
        <StatRow key={key} label={label} value={stats[key] ?? 0} />
      ))}
    </div>
  );
}
