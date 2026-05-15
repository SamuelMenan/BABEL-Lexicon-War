import React, { useEffect, useReducer, useRef } from 'react';
import { Bridge } from '../../../shared/bridge.js';

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES');
function fmt(n) { return NUMBER_FORMATTER.format(n ?? 0); }

const initialState = () => ({ grafemas: Bridge.peekState().grafemas ?? 0, pulse: null });

function reducer(state, action) {
  switch (action.type) {
    case 'set':       return { grafemas: action.grafemas, pulse: action.pulse };
    case 'clearPulse': return { ...state, pulse: null };
    default: return state;
  }
}

// Insignia de saldo de grafemas. Coherente en hangar / combate / carrera.
// Prop `placement`: 'hangar' | 'combat' | 'race'. Ajusta posicionamiento.
export default function WalletBadge({ placement = 'hangar' }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const prevRef  = useRef(state.grafemas);
  const timerRef = useRef(null);

  useEffect(() => {
    return Bridge.onStateChange(s => {
      const next = s.grafemas ?? 0;
      const prev = prevRef.current;
      if (next !== prev) {
        prevRef.current = next;
        clearTimeout(timerRef.current);
        dispatch({ type: 'set', grafemas: next, pulse: next > prev ? 'gain' : 'spend' });
        timerRef.current = setTimeout(() => dispatch({ type: 'clearPulse' }), 700);
      } else {
        dispatch({ type: 'set', grafemas: next, pulse: null });
      }
    });
  }, []);

  const { grafemas, pulse } = state;

  return (
    <div
      className={`wallet-badge wallet-badge--${placement}${pulse ? ` wallet-badge--${pulse}` : ''}`}
      title="Grafemas: moneda del Programa TYPO"
    >
      <span className="wallet-badge__label">GRAFEMAS</span>
      <span className="wallet-badge__value">₲ {fmt(grafemas)}</span>
    </div>
  );
}
