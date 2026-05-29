import React from 'react';
import HangarFrame from './HangarFrame.jsx';
import ShipSelectLoadingScreen from '@app/screens/ShipSelectLoadingScreen.jsx';

// Chrome compartido del hangar 3D (solo + online): wrapper de visibilidad,
// canvas montado, marco y zona segura de HUD. Los paneles especificos de cada
// modo entran como children. Los modales propios de cada modo se renderizan
// como hermanos de <HangarShell>, no aqui.
export default function HangarShell({ phase, loadProgress, canvasAlpha, mountRef, children }) {
  return (
    <>
      <div style={{ visibility: phase === 'loading' ? 'hidden' : 'visible', position: 'absolute', inset: 0 }}>
        <div className="hangar">
          <div ref={mountRef} className="hangar__canvas" style={{ opacity: canvasAlpha }} />

          <HangarFrame />

          <div className="hud-safe-zone">
            {children}
          </div>
        </div>
      </div>

      {phase === 'loading' && <ShipSelectLoadingScreen progress={loadProgress} />}
    </>
  );
}
