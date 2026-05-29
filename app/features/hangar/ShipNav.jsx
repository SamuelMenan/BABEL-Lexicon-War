import React from 'react';
import useTranslation from '@shared/i18n/useTranslation.js';

export default function ShipNav({ idx, total, onPrev, onNext }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="hangar-nav hangar-nav--prev">
        <button type="button" className="hangar-nav__btn" onClick={onPrev} aria-label={t('hangar.nav.prevAria')}>
          &#9664;
        </button>
        <span className="hangar-nav__label">{t('hangar.nav.prevClass')}</span>
      </div>

      <div className="hangar-nav hangar-nav--next">
        <button type="button" className="hangar-nav__btn" onClick={onNext} aria-label={t('hangar.nav.nextAria')}>
          &#9654;
        </button>
        <span className="hangar-nav__label">{t('hangar.nav.nextClass')}</span>
      </div>
    </>
  );
}
