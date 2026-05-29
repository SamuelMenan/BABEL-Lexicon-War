import React, { useEffect, useState } from 'react';
import { KeybindService } from '@shared/services/keybindService.js';

export default function ScopeDebugOverlay() {
  const [scopes, setScopes] = useState(() => KeybindService.getScopes());

  useEffect(() => {
    const handleScopeChange = () => {
      setScopes(KeybindService.getScopes());
    };
    window.addEventListener('babel:scopechange', handleScopeChange);
    return () => {
      window.removeEventListener('babel:scopechange', handleScopeChange);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 9999,
      background: 'rgba(8, 12, 18, 0.95)',
      border: '1px solid var(--col-active, #00ffcc)',
      boxShadow: '0 0 10px rgba(0, 255, 204, 0.3)',
      padding: '8px 12px',
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '11px',
      color: '#fff',
      pointerEvents: 'none',
      borderRadius: '4px',
    }}>
      <div style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '4px',
        marginBottom: '6px',
        color: 'var(--col-active, #00ffcc)',
        fontWeight: 'bold',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        Scope Stack
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {scopes.map((scope, idx) => {
          const isTop = idx === scopes.length - 1;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: isTop ? '#00ffcc' : 'rgba(255, 255, 255, 0.6)',
                fontWeight: isTop ? 'bold' : 'normal',
              }}
            >
              <span style={{ opacity: 0.4 }}>[{idx}]</span>
              <span>{scope}</span>
              {isTop && <span style={{ fontSize: '9px', opacity: 0.8 }}>◀ ACTIVE</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
