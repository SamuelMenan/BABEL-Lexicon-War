import React from 'react';

export default function ShipNav({ idx, total, onPrev, onNext }) {
  return (
    <>
      <div className="hangar-nav hangar-nav--prev">
        <button className="hangar-nav__btn" onClick={onPrev} aria-label="Nave anterior">
          &#9664;
        </button>
        <span className="hangar-nav__label">PREV · CLASE</span>
      </div>

      <div className="hangar-nav hangar-nav--next">
        <button className="hangar-nav__btn" onClick={onNext} aria-label="Nave siguiente">
          &#9654;
        </button>
        <span className="hangar-nav__label">NEXT · CLASE</span>
      </div>
    </>
  );
}
