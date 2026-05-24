import React, { useEffect } from 'react';
import { Bridge } from '../../shared/bridge.js';

// Banner toast global para avisos online (rechazo revancha, etc.).
// Auto-dismiss en 4s.
export default function OnlineNoticeBanner({ notice }) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => Bridge.setState({ onlineNotice: null }), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!notice) return null;
  const kind = notice.kind || 'info';
  return (
    <div className={`online-notice online-notice--${kind}`} role="status">
      <span className="online-notice__msg">{notice.message}</span>
      <button
        type="button"
        className="online-notice__close"
        onClick={() => Bridge.setState({ onlineNotice: null })}
        aria-label="Cerrar aviso"
      >✕</button>
    </div>
  );
}
