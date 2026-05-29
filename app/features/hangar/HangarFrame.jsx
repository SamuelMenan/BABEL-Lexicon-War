import React from 'react';
import useTranslation from '@shared/i18n/useTranslation.js';

export default function HangarFrame() {
  const { t } = useTranslation();

  return (
    <div className="hangar-frame" aria-hidden="true">
      <div className="hangar-frame__scan-label">{t('hangar.unitScan')}</div>

      <div className="hangar-frame__viewport">
        <span className="hangar-frame__bracket hangar-frame__bracket--tl" />
        <span className="hangar-frame__bracket hangar-frame__bracket--tr" />
        <span className="hangar-frame__bracket hangar-frame__bracket--bl" />
        <span className="hangar-frame__bracket hangar-frame__bracket--br" />
      </div>

      <div className="hangar-frame__axis-label">{t('hangar.axisZ')}</div>

      <div className="hangar-frame__scanlines" />
      <div className="hangar-frame__vignette" />
    </div>
  );
}
