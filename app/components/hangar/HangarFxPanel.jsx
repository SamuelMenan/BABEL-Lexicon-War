// Panel de FX preview en hangar. Botones DOM siempre visibles.
// Reemplaza atajos K/L/J/Delete y Home/End/PgUp/PgDn.

import React, { useState, useCallback } from 'react';
import '../../../styles/components/hangar-fx-panel.css';

export default function HangarFxPanel({ sceneRef, deployingRef }) {
  const [laserOn, setLaserOn] = useState(false);
  const [flowOn,  setFlowOn]  = useState(false);
  const [confirmDetonate, setConfirmDetonate] = useState(false);
  const [autoFire, setAutoFire] = useState(false);

  const blocked = () => !!deployingRef?.current;

  const onFireStart = useCallback(() => {
    if (blocked()) return;
    setAutoFire(true);
    sceneRef.current?.startAutoFire?.();
  }, [sceneRef]);

  const onFireEnd = useCallback(() => {
    setAutoFire(false);
    sceneRef.current?.stopAutoFire?.();
  }, [sceneRef]);

  const onLaser = useCallback(() => {
    if (blocked()) return;
    sceneRef.current?.toggleLaser?.();
    setLaserOn(v => !v);
  }, [sceneRef]);

  const onFlow = useCallback(() => {
    if (blocked()) return;
    sceneRef.current?.toggleFlowSim?.();
    setFlowOn(v => !v);
  }, [sceneRef]);

  const onCycleCam = useCallback(() => {
    sceneRef.current?.cycleCameraView?.();
  }, [sceneRef]);

  const onResetCam = useCallback(() => {
    sceneRef.current?.resetOrbit?.();
  }, [sceneRef]);

  const onDetonate = useCallback(() => {
    if (blocked()) return;
    if (!confirmDetonate) { setConfirmDetonate(true); setTimeout(() => setConfirmDetonate(false), 2500); return; }
    sceneRef.current?.detonateCurrentShip?.();
    setConfirmDetonate(false);
  }, [sceneRef, confirmDetonate]);

  return (
    <div className="hangar-fx" role="toolbar" aria-label="Vista previa de FX">
      <button className="hangar-fx__btn" onPointerDown={onCycleCam} aria-label="Ciclar camara">
        <span className="hangar-fx__icon">📐</span>
        <span className="hangar-fx__label">Camara</span>
      </button>
      <button className="hangar-fx__btn" onPointerDown={onResetCam} aria-label="Reset camara">
        <span className="hangar-fx__icon">⟲</span>
        <span className="hangar-fx__label">Reset</span>
      </button>
      <button
        className={`hangar-fx__btn${autoFire ? ' hangar-fx__btn--on' : ''}`}
        onPointerDown={onFireStart}
        onPointerUp={onFireEnd}
        onPointerLeave={onFireEnd}
        aria-label="Disparar (mantener)"
      >
        <span className="hangar-fx__icon">🔫</span>
        <span className="hangar-fx__label">Disparar</span>
      </button>
      <button
        className={`hangar-fx__btn${laserOn ? ' hangar-fx__btn--on' : ''}`}
        onPointerDown={onLaser}
        aria-pressed={laserOn}
        aria-label="Toggle laser"
      >
        <span className="hangar-fx__icon">⚡</span>
        <span className="hangar-fx__label">Laser</span>
      </button>
      <button
        className={`hangar-fx__btn${flowOn ? ' hangar-fx__btn--on' : ''}`}
        onPointerDown={onFlow}
        aria-pressed={flowOn}
        aria-label="Toggle boosters flow"
      >
        <span className="hangar-fx__icon">🔥</span>
        <span className="hangar-fx__label">Boosters</span>
      </button>
      <button
        className={`hangar-fx__btn hangar-fx__btn--danger${confirmDetonate ? ' hangar-fx__btn--armed' : ''}`}
        onPointerDown={onDetonate}
        aria-label="Detonar nave (preview)"
      >
        <span className="hangar-fx__icon">💥</span>
        <span className="hangar-fx__label">{confirmDetonate ? 'Confirmar' : 'Detonar'}</span>
      </button>
    </div>
  );
}
