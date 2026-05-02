import React from 'react';

export default function HangarFrame() {
  return (
    <div className="hangar-frame" aria-hidden="true">
      <div className="hangar-frame__scan-label">« UNIT · SCAN »</div>

      <div className="hangar-frame__viewport">
        <span className="hangar-frame__bracket hangar-frame__bracket--tl" />
        <span className="hangar-frame__bracket hangar-frame__bracket--tr" />
        <span className="hangar-frame__bracket hangar-frame__bracket--bl" />
        <span className="hangar-frame__bracket hangar-frame__bracket--br" />
      </div>

      <div className="hangar-frame__axis-label">EJE · Z</div>

      <div className="hangar-frame__scanlines" />
      <div className="hangar-frame__vignette" />
    </div>
  );
}
