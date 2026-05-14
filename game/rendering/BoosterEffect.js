import * as THREE from 'three';
import { getQualityProfile } from '../../shared/qualitySettings.js';
import { getFlameTexture, getInnerTexture, getStarTexture } from './booster/BoosterTextures.js';
import { getConeGeometry, getRingGeometry } from './booster/BoosterGeometry.js';
import { BOOST_PALETTE, FLOW_PALETTE } from './booster/BoosterConfig.js';
import { computeFlicker, computeColors, createLateralState, updateLateral } from './booster/BoosterAnimation.js';

export { SHIP_BOOSTER_CONFIGS } from './booster/BoosterConfig.js';

/** Interpolate a numeric ramp of any length at t∈[0,1]. */
function sampleScalarRamp(ramp, t) {
  if (!ramp || ramp.length < 2) return 1;
  const c   = Math.max(0, Math.min(1, t));
  const n   = ramp.length - 1;
  const seg = Math.min(n - 1, Math.floor(c * n));
  const frac = c * n - seg;
  return ramp[seg] + (ramp[seg + 1] - ramp[seg]) * frac;
}

export class BoosterEffect {
  constructor(config) {
    this._t               = 0;
    this._currentStrength = 0.28;
    this._cfg             = null;
    this._letterBurst     = 0;
    this._smoothFlowSize    = 0.0;  // lerped size multiplier from sizeRamp
    this._smoothFlowOpacity = 0.0;  // lerped opacity multiplier from opacityRamp

    this._lateralState = createLateralState();
    this._shipGroup    = null;

    this._hangarMode = false;

    this._colors = {
      body:  new THREE.Color(),
      flame: new THREE.Color(),
      inner: new THREE.Color(),
      ring:  new THREE.Color(),
      star:  new THREE.Color(),
    };

    this._root = new THREE.Object3D();
    this._root.name = 'BoosterEffect';

    this._bodyMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this._body = new THREE.Mesh(getConeGeometry(), this._bodyMat);
    this._body.castShadow = false;
    this._body.receiveShadow = false;
    this._root.add(this._body);

    this._ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.90,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._ring = new THREE.Mesh(getRingGeometry(), this._ringMat);
    this._ring.castShadow = false;
    this._ring.receiveShadow = false;
    this._root.add(this._ring);

    this._flameMat = new THREE.SpriteMaterial({
      map: getFlameTexture(), color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._flame = new THREE.Sprite(this._flameMat);
    this._root.add(this._flame);

    this._innerMat = new THREE.SpriteMaterial({
      map: getInnerTexture(), color: 0xffffff, transparent: true, opacity: 0.90,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._inner = new THREE.Sprite(this._innerMat);
    this._root.add(this._inner);

    this._starMat = new THREE.SpriteMaterial({
      map: getStarTexture(), color: 0xffffff, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false, rotation: 0,
    });
    this._star = new THREE.Sprite(this._starMat);
    this._root.add(this._star);

    this._light = new THREE.PointLight(0xffffff, 0.45, 4);
    this._root.add(this._light);

    const profile = getQualityProfile();
    this._lightMult      = profile.boosterLightMult;
    this._showStarSprite = profile.boosterStarSprite;
    if (!this._showStarSprite) this._star.visible = false;

    if (config) this.setConfig(config);
  }

  attachToShip(shipGroup) {
    if (this._root.parent) this._root.parent.remove(this._root);
    shipGroup.add(this._root);
    this._shipGroup = shipGroup;
    this._lateralState.hasPos  = false;
    this._lateralState.prevYaw = shipGroup.rotation.y || 0;
  }

  triggerLetterHit(intensity = 1.0) {
    this._letterBurst = Math.min(1.0, this._letterBurst + intensity * 0.9);
  }

  setConfig(cfg) {
    this._cfg = cfg;
    this._root.position.copy(cfg.localPosition);
    this._body.scale.set(cfg.bodyRadius, cfg.bodyRadius, cfg.bodyLength);
    this._bodyMat.color.set(cfg.bodyColor);
    const rr = cfg.ringRadius ?? cfg.bodyRadius * 1.8;
    this._ring.scale.setScalar(rr);
    this._ring.position.set(0, 0, 0);
    this._ringMat.color.set(cfg.ringColor ?? cfg.bodyColor);
    this._flameMat.color.set(cfg.flameColor);
    this._flame.scale.setScalar(cfg.flameSize);
    this._flame.position.set(0, 0, 0.05);
    this._innerMat.color.set(cfg.innerColor);
    this._inner.scale.setScalar(cfg.innerSize);
    this._inner.position.set(0, 0, 0.05);
    if (this._showStarSprite) {
      this._starMat.color.set(cfg.starColor);
      this._star.scale.setScalar(cfg.starSize);
      this._star.position.set(0, 0, 0.08);
    }
    this._light.color.set(cfg.lightColor);
    this._light.intensity = cfg.lightIntens * 0.35;
    this._light.distance  = cfg.lightDist;
    this._light.position.copy(cfg.lightOffset);
  }

  setHangarMode(enabled) {
    if (enabled !== this._hangarMode) {
      this._hangarMode = enabled;
      // Marca para que el próximo update snap-ee smoothFlowSize/Opacity al
      // target nuevo, sin lerp visible (evita parpadeo de opacidad al cambiar
      // entre hangar-idle y simulación/despliegue).
      this._modeSwitchPending = true;
    } else {
      this._hangarMode = enabled;
    }
  }

  update(deltaTime, isAccelerating, visualScale = 1, ringScale = 1, flowRatio = 0) {
    this._t += deltaTime;
    const cfg = this._cfg;
    if (!cfg) return;

    const t        = this._t;
    const sizeMult = Math.max(0.75, Number(visualScale) || 1);
    const ringMult = Math.max(0.75, Number(ringScale) || 1);

    const flicker = computeFlicker(t);
    const target  = isAccelerating ? 0.72 + flicker * 0.28 : 0.25 + flicker * 0.14;
    const rate    = isAccelerating ? 5.5 : 3.8;
    this._currentStrength += (target - this._currentStrength) * Math.min(deltaTime * rate, 1);
    const s = this._currentStrength;

    this._letterBurst = Math.max(0, this._letterBurst - deltaTime * 4.5);
    const lb = this._letterBurst;

    // Pipeline unificado: frEff = flowRatio en los 3 modos (hangar / combat / racing).
    const frEff = flowRatio;
    computeColors(s, flicker, lb, frEff, BOOST_PALETTE, FLOW_PALETTE, this._colors, this._cfg);
    const col = this._colors;
    this._bodyMat.color.copy(col.body);
    this._ringMat.color.copy(col.ring);
    this._flameMat.color.copy(col.flame);
    this._innerMat.color.copy(col.inner);
    if (this._showStarSprite) this._starMat.color.copy(col.star);
    this._light.color.copy(col.flame);

    // Size: en hangar-idle locked a 1.0; en flow ramp por cfg.sizeRamp.
    // Opacity: curva multiplicativa derivada de frEff (no aditiva → idle
    // efectivamente transparente).
    // Size manual min/max: cfg.sizeMin (idle) → cfg.sizeMax (FLOW). Lerp por frEff.
    // Fallback a sizeRamp legacy si no se definen.
    const sMin = cfg.sizeMin;
    const sMax = cfg.sizeMax;
    const targetFlowSize = (sMin != null && sMax != null)
      ? sMin + frEff * (sMax - sMin)
      : sampleScalarRamp(cfg.sizeRamp, flowRatio);
    const targetFlowOpacity =                          sampleScalarRamp(cfg.opacityRamp, frEff);
    const dSize = Math.abs(targetFlowSize    - this._smoothFlowSize);
    const dOpac = Math.abs(targetFlowOpacity - this._smoothFlowOpacity);
    const rateSize = dSize > 0.3 ? 8 : 4;
    const rateOpac = dOpac > 0.3 ? 8 : 4;
    this._smoothFlowSize    += (targetFlowSize    - this._smoothFlowSize)    * Math.min(deltaTime * rateSize, 1);
    this._smoothFlowOpacity += (targetFlowOpacity - this._smoothFlowOpacity) * Math.min(deltaTime * rateOpac, 1);
    this._modeSwitchPending = false;
    const fsm = this._smoothFlowSize;
    const fop = this._smoothFlowOpacity;  // ∈ [0.05 idle, 1.0 FLOW] — multiplicador puro

    const lateral   = updateLateral(this._lateralState, this._shipGroup, deltaTime);
    const velBoost  = Math.abs(lateral) * 1.10;
    const burstMult = 1.0 + lb * 0.45 + velBoost * 0.40;

    this._root.position.x = (cfg.localPosition.x ?? 0) + lateral * 0.20;
    this._root.position.y = (cfg.localPosition.y ?? 0) - s * 0.025;
    this._root.position.z = (cfg.localPosition.z ?? 0) - s * 0.18;

    const sm = sizeMult * fsm;  // combined size multiplier
    const rm = ringMult * fsm;

    const coneW = cfg.bodyRadius * (0.45 + s * 0.70) * burstMult * sm;
    const coneL = cfg.bodyLength * (0.65 + s * 1.0) * (1.0 + lb * 0.65 + velBoost * 0.40) * sm;
    this._body.scale.set(coneW, coneW, coneL);
    const rawBodyOp  = Math.min(0.95, (0.45 + s * 0.50) * (1.0 + lb * 0.40));
    // Multiplicativo: idle (fop≈0.05) → casi invisible; FLOW (fop=1) → rawOp.
    this._bodyMat.opacity = rawBodyOp * fop;
    this._body.rotation.z = lateral * 0.55;
    this._body.rotation.y = -lateral * 0.20;

    // Ring: usar SOLO rm (sizeMult * fsm). Antes era sm * rm = sizeMult * ringMult * fsm²
    // — fsm cuadrado provocaba aros enormes en despliegue.
    const ringBreath = 1.0 + Math.sin(t * 4.8) * 0.04 + s * 0.15;
    const rr = (cfg.ringRadius ?? cfg.bodyRadius * 1.8) * ringBreath * (1.0 + lb * 0.55 + velBoost * 0.25) * rm;
    this._ring.scale.setScalar(rr);
    const rawRingOp  = Math.min(1.0, (0.55 + s * 0.40 + flicker * 0.10) * (1.0 + lb * 1.40));
    this._ringMat.opacity = rawRingOp * fop;
    this._ring.rotation.z += deltaTime * (0.8 + s * 1.5 + Math.abs(lateral) * 2.0);

    this._flame.scale.setScalar(cfg.flameSize * (0.65 + s * 0.55 + flicker * 0.12) * burstMult * sm);
    const rawFlameOp = Math.min(0.95, (0.60 + s * 0.30 + flicker * 0.08) * (1.0 + lb * 0.50));
    this._flameMat.opacity = rawFlameOp * fop;

    const coreF = Math.sin(t * 19.3) * 0.5 + 0.5;
    this._inner.scale.setScalar(cfg.innerSize * (0.55 + s * 0.40 + coreF * 0.08) * (0.90 + Math.abs(lateral) * 0.12) * (1.0 + lb * 0.85) * sm);
    const rawInnerOp = Math.min(1.0, (0.70 + s * 0.36 + coreF * 0.05) * (1.0 + lb * 1.60));
    this._innerMat.opacity = rawInnerOp * fop;

    if (this._showStarSprite) {
      const starPulse = (0.30 + s * 0.42 + flicker * 0.08) * (1.0 + lb * 3.00);
      this._star.scale.setScalar(cfg.starSize * starPulse * sm);
      const rawStarOp = isAccelerating
        ? Math.min(1.0, (0.28 + s * 0.32 + flicker * 0.06) * (1.0 + lb * 1.10))
        : Math.min(1.0, (0.08 + s * 0.14 + flicker * 0.04) * (1.0 + lb * 1.10));
      this._starMat.opacity = rawStarOp * fop;
      this._starMat.rotation += deltaTime * 0.35;
    }

    this._light.intensity = cfg.lightIntens * this._lightMult
      * (0.30 + s * 0.90 + flicker * 0.18)
      * (1.0 + lb * 1.20)
      * fsm;
    this._light.position.x = (cfg.lightOffset?.x ?? 0) + lateral * 0.25;
  }

  setThermalColor(hexColor) {
    this._bodyMat.color.set(hexColor);
    this._ringMat.color.set(hexColor);
    this._flameMat.color.set(hexColor);
    this._innerMat.color.set(hexColor);
    if (this._showStarSprite) this._starMat.color.set(hexColor);
    this._light.color.set(hexColor);
  }

  dispose() {
    if (this._root.parent) this._root.parent.remove(this._root);
    this._bodyMat.dispose();
    this._ringMat.dispose();
    this._flameMat.dispose();
    this._innerMat.dispose();
    this._starMat.dispose();
  }
}
