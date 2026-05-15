import React, { useEffect, useRef, useState } from 'react';
import { Bridge } from '../../../shared/bridge.js';

function fmt(n) { return new Intl.NumberFormat('es-ES').format(n ?? 0); }

// Insignia de saldo de grafemas. Coherente en hangar / combate / carrera.
// Prop `placement`: 'hangar' | 'combat' | 'race' — ajusta posicionamiento.
export default function WalletBadge({ placement = 'hangar' }) {
  const [grafemas, setGrafemas] = useState(() => Bridge.peekState().grafemas ?? 0);
  const [pulse, setPulse]       = useState(null);
  const prevRef                 = useRef(grafemas);
  const timerRef                = useRef(null);

  useEffect(() => {
    return Bridge.onStateChange(s => {
      const next = s.grafemas ?? 0;
      if (next !== prevRef.current) {
        setPulse(next > prevRef.current ? 'gain' : 'spend');
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setPulse(null), 700);
        prevRef.current = next;
      }
      setGrafemas(next);
    });
  }, []);

  return (
    <div
      className={`wallet-badge wallet-badge--${placement}${pulse ? ` wallet-badge--${pulse}` : ''}`}
      title="Grafemas — moneda del Programa TYPO"
    >
      <span className="wallet-badge__label">GRAFEMAS</span>
      <span className="wallet-badge__value">₲ {fmt(grafemas)}</span>
    </div>
  );
}
