// Panel de FX preview en hangar. Botones DOM siempre visibles.
// Reemplaza atajos K/L/J/Delete y Home/End/PgUp/PgDn.

import React, { useState, useCallback } from 'react';
import Icon from '../common/Icon.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';
import '../../../styles/components/hangar-fx-panel.css';

export default function HangarFxPanel({ sceneRef, deployingRef }) {
  const { t } = useTranslation();
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
    <div className="hangar-fx" role="toolbar" aria-label={t('hangar.fx.toolbarAria')}>
      <button className="hangar-fx__btn" onPointerDown={onCycleCam} aria-label={t('hangar.fx.cycleCamAria')}>
        <span className="hangar-fx__icon"><Icon name="videocam" size={20} /></span>
        <span className="hangar-fx__label">{t('hangar.fx.camera')}</span>
      </button>
      <button className="hangar-fx__btn" onPointerDown={onResetCam} aria-label={t('hangar.fx.resetCamAria')}>
        <span className="hangar-fx__icon">⟲</span>
        <span className="hangar-fx__label">{t('keys.reset')}</span>
      </button>
      <button
        className={`hangar-fx__btn${autoFire ? ' hangar-fx__btn--on' : ''}`}
        onPointerDown={onFireStart}
        onPointerUp={onFireEnd}
        onPointerLeave={onFireEnd}
        aria-label={t('hangar.fx.fireAria')}
      >
        <span className="hangar-fx__icon"><Icon name="rocket_launch" size={20} /></span>
        <span className="hangar-fx__label">{t('hangar.fx.fire')}</span>
      </button>
      <button
        className={`hangar-fx__btn${laserOn ? ' hangar-fx__btn--on' : ''}`}
        onPointerDown={onLaser}
        aria-pressed={laserOn}
        aria-label={t('hangar.fx.laserAria')}
      >
        <span className="hangar-fx__icon"><Icon name="bolt" size={20} /></span>
        <span className="hangar-fx__label">{t('hangar.fx.laser')}</span>
      </button>
      <button
        className={`hangar-fx__btn${flowOn ? ' hangar-fx__btn--on' : ''}`}
        onPointerDown={onFlow}
        aria-pressed={flowOn}
        aria-label={t('hangar.fx.boostersAria')}
      >
        <span className="hangar-fx__icon"><Icon name="local_fire_department" size={20} /></span>
        <span className="hangar-fx__label">{t('hangar.fx.boosters')}</span>
      </button>
      <button
        className={`hangar-fx__btn hangar-fx__btn--danger${confirmDetonate ? ' hangar-fx__btn--armed' : ''}`}
        onPointerDown={onDetonate}
        aria-label={t('hangar.fx.detonateAria')}
      >
        <span className="hangar-fx__icon"><Icon name="dangerous" size={20} /></span>
        <span className="hangar-fx__label">{confirmDetonate ? t('common.confirm') : t('hangar.fx.detonate')}</span>
      </button>
    </div>
  );
}
