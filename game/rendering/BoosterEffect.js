import * as THREE from 'three';
import { BLOOM_LAYER } from '../../shared/constants.js';
import { getQualityProfile } from '../../shared/qualitySettings.js';

// --------------------------------------------------------------------------
// Texture factories (lazily created, globally cached)
// --------------------------------------------------------------------------

let _flameTex = null;
let _innerTex = null;
let _starTex  = null;

const _boostDark  = new THREE.Color(0x102a7a);
const _boostMid   = new THREE.Color(0x4d7eff);
const _boostLight = new THREE.Color(0xb8f2ff);
const _flowDark   = new THREE.Color(0xb400ff); // Extremadamente morado e intenso
const _flowMid    = new THREE.Color(0xdb00ff); // Destello magenta ultra fuerte
const _flowLight  = new THREE.Color(0xea00ff); // Núcleo magenta vivo sin lavarlo con blanco
const _tmpColorA  = new THREE.Color();
const _tmpColorB  = new THREE.Color();
const _tmpColorC  = new THREE.Color();
const _tmpColorD  = new THREE.Color();
const _tmpColorE  = new THREE.Color();

function _buildFlameTexture() {
  const size   = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx    = canvas.getContext('2d');
  const g      = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.10, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.30, 'rgba(255,255,255,0.58)');
  g.addColorStop(0.60, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.04)');
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

function _buildInnerTexture() {
  const size   = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx    = canvas.getContext('2d');
  const g      = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.70)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.22)');
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

function _buildStarTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const drawStreak = (angle, halfLen, halfW) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
    g.addColorStop(0,    'rgba(255,255,255,0)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.08)');
    g.addColorStop(0.50, 'rgba(255,255,255,1)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.08)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen, halfW, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawStreak(0,             size * 0.49, size * 0.024);
  drawStreak(Math.PI / 2,   size * 0.49, size * 0.024);
  drawStreak(Math.PI / 4,   size * 0.37, size * 0.015);
  drawStreak(-Math.PI / 4,  size * 0.37, size * 0.015);

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.11);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

function _getFlame() { return (_flameTex ??= _buildFlameTexture()); }
function _getInner() { return (_innerTex  ??= _buildInnerTexture()); }
function _getStar()  { return (_starTex   ??= _buildStarTexture());  }

// Shared exhaust cone — base at Z=0 (nozzle mouth), tip at +Z (behind ship toward camera).
let _coneGeo = null;
function _getConeGeo() {
  if (_coneGeo) return _coneGeo;
  _coneGeo = new THREE.CylinderGeometry(0, 1, 1, 8, 1, true);
  _coneGeo.rotateX(Math.PI / 2);
  _coneGeo.translate(0, 0, 0.5);
  return _coneGeo;
}

// Shared nozzle ring — TorusGeometry in XY plane (faces Z by default).
let _ringGeo = null;
function _getRingGeo() {
  if (_ringGeo) return _ringGeo;
  _ringGeo = new THREE.TorusGeometry(1, 0.09, 8, 32);
  return _ringGeo;
}

// --------------------------------------------------------------------------
// Ship preset configs
// --------------------------------------------------------------------------

export const SHIP_BOOSTER_CONFIGS = {

  // spaceshipnew.glb  |  targetLength 3.8
  combatPlayer: {
    localPosition: new THREE.Vector3(0, -0.18, 2.10),
    bodyRadius:    0.14,
    bodyLength:    1.20,
    ringRadius:    0.26,
    flameSize:     0.95,
    innerSize:     0.42,
    starSize:      1.10,
    lightColor:    0x86e8ff,
    lightIntens:   9.0,
    lightDist:     16.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    bodyColor:     0x2340b8,
    flameColor:    0x7fdcff,
    innerColor:    0xbef2ff,
    starColor:     0x16368f,
    ringColor:     0x5d84ff,
  },

  // spaceship.glb  |  targetLength 5.0
  racingPlayer: {
    localPosition: new THREE.Vector3(0, -0.34, 2.25),
    bodyRadius:    0.22,
    bodyLength:    0.88,
    ringRadius:    0.32,
    flameSize:     1.85,
    innerSize:     0.75,
    starSize:      2.90,
    lightColor:    0x86e8ff,
    lightIntens:   6.5,
    lightDist:     12.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.45),
    bodyColor:     0x1f3d9f,
    flameColor:    0x8adfff,
    innerColor:    0xc7f7ff,
    starColor:     0x17368f,
    ringColor:     0x6b8cff,
  },

  // spaceship__low_poly.glb  |  targetLength 3.2
  racingOpponent: {
    localPosition: new THREE.Vector3(0, -0.16, 1.38),
    bodyRadius:    0.16,
    bodyLength:    0.65,
    ringRadius:    0.24,
    flameSize:     1.50,
    innerSize:     0.60,
    starSize:      2.35,
    lightColor:    0xff4422,
    lightIntens:   5.8,
    lightDist:     10.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.30),
    bodyColor:     0xff5533,
    flameColor:    0xff3311,
    innerColor:    0xffd0c0,
    starColor:     0xff6644,
    ringColor:     0xff4422,
  },
};

// --------------------------------------------------------------------------
// BoosterEffect
// --------------------------------------------------------------------------

export class BoosterEffect {
  constructor(config = SHIP_BOOSTER_CONFIGS.racingPlayer) {
    this._t               = 0;
    this._currentStrength = 0.28;
    this._cfg             = null;
    this._prevShipPos     = new THREE.Vector3();
    this._hasPrevShipPos  = false;
    this._prevShipYaw     = 0;
    this._dynamicLateral  = 0;

    // Letter hit burst — decays quickly after triggerLetterHit() call.
    this._letterBurst     = 0;

    this._root = new THREE.Object3D();
    this._root.name = 'BoosterEffect';

    // Exhaust cone — DoubleSide so it renders from outside and inside.
    const coneGeo = _getConeGeo();
    this._bodyMat = new THREE.MeshBasicMaterial({
      color:       0xffffff,
      transparent: true,
      opacity:     0.65, // Aumentado para mayor presencia de color
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    });
    this._body = new THREE.Mesh(coneGeo, this._bodyMat);
    this._body.castShadow = false;
    this._body.receiveShadow = false;
    this._body.layers.enable(BLOOM_LAYER);
    this._root.add(this._body);

    // Nozzle ring — glowing torus at engine mouth.
    this._ringMat = new THREE.MeshBasicMaterial({
      color:       0xffffff,
      transparent: true,
      opacity:     0.90,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    this._ring = new THREE.Mesh(_getRingGeo(), this._ringMat);
    this._ring.castShadow = false;
    this._ring.receiveShadow = false;
    this._ring.layers.enable(BLOOM_LAYER);
    this._root.add(this._ring);

    // Outer halo sprite — circular glow at nozzle mouth.
    this._flameMat = new THREE.SpriteMaterial({
      map:         _getFlame(),
      color:       0xffffff,
      transparent: true,
      opacity:     0.95, // Aumentado para que el resplandor sea menos opaco/más sólido
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    this._flame = new THREE.Sprite(this._flameMat);
    this._flame.layers.enable(BLOOM_LAYER);
    this._root.add(this._flame);

    // Hot-core sprite.
    this._innerMat = new THREE.SpriteMaterial({
      map:         _getInner(),
      color:       0xffffff,
      transparent: true,
      opacity:     0.90,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    this._inner = new THREE.Sprite(this._innerMat);
    this._inner.layers.enable(BLOOM_LAYER);
    this._root.add(this._inner);

    // Star burst sprite — subtle bloom accent.
    this._starMat = new THREE.SpriteMaterial({
      map:         _getStar(),
      color:       0xffffff,
      transparent: true,
      opacity:     0.45,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      rotation:    0,
    });
    this._star = new THREE.Sprite(this._starMat);
    this._star.layers.enable(BLOOM_LAYER);
    this._root.add(this._star);

    // Dynamic point light
    this._light = new THREE.PointLight(0xffffff, 1, 8);
    this._root.add(this._light);

    const profile = getQualityProfile();
    this._lightMult      = profile.boosterLightMult;
    this._showStarSprite = profile.boosterStarSprite;
    if (!this._showStarSprite) this._star.visible = false;

    this.setConfig(config);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  attachToShip(shipGroup) {
    if (this._root.parent) this._root.parent.remove(this._root);
    shipGroup.add(this._root);
    this._shipGroup = shipGroup;
    this._hasPrevShipPos = false;
    this._prevShipYaw = shipGroup.rotation.y || 0;
  }

  // Call this when the player types a correct letter.
  // intensity: 0..1, controls burst magnitude.
  triggerLetterHit(intensity = 1.0) {
    this._letterBurst = Math.min(1.0, (this._letterBurst + intensity * 0.9));
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

  update(deltaTime, isAccelerating, visualScale = 1, ringScale = 1, flowActive = false) {
    this._t += deltaTime;

    const t   = this._t;
    const cfg = this._cfg;
    if (!cfg) return;
    const sizeMult = Math.max(0.75, Number(visualScale) || 1);
    const ringMult = Math.max(0.75, Number(ringScale) || 1);

    // Multi-frequency flicker
    const f1 = Math.sin(t * 13.1) * 0.5 + 0.5;
    const f2 = Math.sin(t *  5.7) * 0.5 + 0.5;
    const f3 = Math.sin(t *  1.9) * 0.5 + 0.5;
    const flicker = f1 * 0.20 + f2 * 0.48 + f3 * 0.32;

    const targetStrength = isAccelerating
      ? 0.72 + flicker * 0.28
      : 0.25 + flicker * 0.14;

    const lerpRate = isAccelerating ? 5.5 : 3.8;
    const alpha = Math.min(deltaTime * lerpRate, 1);
    this._currentStrength += (targetStrength - this._currentStrength) * alpha;
    const s = this._currentStrength;

    // Decay letter burst (~0.18 s half-life)
    this._letterBurst = Math.max(0, this._letterBurst - deltaTime * 4.5);
    const lb = this._letterBurst; // 0..1
    const baseMix = THREE.MathUtils.clamp(0.20 + s * 0.45 + flicker * 0.12 + lb * 0.18, 0, 1);
    const glowMix = THREE.MathUtils.clamp(0.35 + s * 0.50 + lb * 0.22, 0, 1);
    const flowMix = THREE.MathUtils.clamp(0.55 + s * 0.30 + flicker * 0.10 + lb * 0.25, 0, 1);

    if (flowActive) {
      _tmpColorA.lerpColors(_flowDark, _flowMid, flowMix);
      _tmpColorB.lerpColors(_flowMid, _flowLight, THREE.MathUtils.clamp(0.45 + s * 0.35 + lb * 0.20, 0, 1));
      _tmpColorC.lerpColors(_flowDark, _flowLight, THREE.MathUtils.clamp(0.35 + s * 0.35 + flicker * 0.10, 0, 1));
      _tmpColorD.lerpColors(_flowDark, _flowMid, THREE.MathUtils.clamp(0.48 + s * 0.38, 0, 1));
      _tmpColorE.lerpColors(_flowMid, _flowLight, THREE.MathUtils.clamp(0.50 + s * 0.28 + lb * 0.12, 0, 1));
    } else {
      _tmpColorA.lerpColors(_boostDark, _boostMid, baseMix);
      _tmpColorB.lerpColors(_boostMid, _boostLight, glowMix);
      _tmpColorC.lerpColors(_boostDark, _boostLight, THREE.MathUtils.clamp(0.45 + s * 0.30 + flicker * 0.10, 0, 1));
      _tmpColorD.lerpColors(_boostDark, _boostMid, THREE.MathUtils.clamp(0.30 + s * 0.42, 0, 1));
      _tmpColorE.lerpColors(_boostMid, _boostLight, THREE.MathUtils.clamp(0.50 + s * 0.30 + lb * 0.10, 0, 1));
    }

    this._bodyMat.color.copy(_tmpColorA);
    this._ringMat.color.copy(_tmpColorD);
    this._flameMat.color.copy(_tmpColorB);
    this._innerMat.color.copy(_tmpColorC);
    if (this._showStarSprite) this._starMat.color.copy(_tmpColorE);
    this._light.color.copy(_tmpColorB);

    // Lateral response: roll + side velocity + yaw rate
    let lateral = 0;
    if (this._shipGroup) {
      const rollLateral = THREE.MathUtils.clamp(-this._shipGroup.rotation.z * 5.2, -1, 1);
      const shipPos = this._shipGroup.position;
      if (!this._hasPrevShipPos) {
        this._prevShipPos.copy(shipPos);
        this._hasPrevShipPos = true;
      }
      const sideVel = THREE.MathUtils.clamp(
        (shipPos.x - this._prevShipPos.x) / Math.max(deltaTime, 1e-4) * 0.45, -1, 1
      );
      this._prevShipPos.copy(shipPos);

      const yawDeltaRaw = this._shipGroup.rotation.y - this._prevShipYaw;
      const yawDelta = Math.atan2(Math.sin(yawDeltaRaw), Math.cos(yawDeltaRaw));
      const yawLateral = THREE.MathUtils.clamp(
        -yawDelta / Math.max(deltaTime, 1e-4) * 0.09, -1, 1
      );
      this._prevShipYaw = this._shipGroup.rotation.y;

      const rawLateral = rollLateral * 0.45 + sideVel * 0.35 + yawLateral * 0.20;
      this._dynamicLateral += (rawLateral - this._dynamicLateral) * Math.min(deltaTime * 10.0, 1);
      lateral = THREE.MathUtils.clamp(this._dynamicLateral, -1, 1);
    }

    // Combined scale multiplier: letter burst + X-axis movement
    const velBoost    = Math.abs(lateral) * 1.10;   // more boost when banking hard
    const burstMult   = 1.0 + lb * 2.20 + velBoost * 0.60;

    this._root.position.x = (cfg.localPosition.x ?? 0) + lateral * 0.20;
    this._root.position.y = (cfg.localPosition.y ?? 0) - s * 0.025;
    this._root.position.z = (cfg.localPosition.z ?? 0) - s * 0.18;

    // Exhaust cone — grows with burst and lateral movement
    const coneW = cfg.bodyRadius * (0.45 + s * 0.70) * burstMult * sizeMult;
    const coneL = cfg.bodyLength * (0.65 + s * 1.0)  * (1.0 + lb * 1.60 + velBoost * 0.60) * sizeMult;
    this._body.scale.set(coneW, coneW, coneL);
    this._bodyMat.opacity = Math.min(0.95, (0.08 + s * 0.32) * (1.0 + lb * 0.80));
    this._body.rotation.z = lateral * 0.55;
    this._body.rotation.y = -lateral * 0.20;

    // Nozzle ring — bursts wider on correct letter, faster spin when banking
    const ringBreath  = 1.0 + Math.sin(t * 4.8) * 0.04 + s * 0.15;
    const rr = (cfg.ringRadius ?? cfg.bodyRadius * 1.8) * ringBreath * (1.0 + lb * 1.40 + velBoost * 0.40) * sizeMult * ringMult;
    this._ring.scale.setScalar(rr);
    this._ringMat.opacity = Math.min(1.0, (0.55 + s * 0.40 + flicker * 0.10) * (1.0 + lb * 1.40));
    this._ring.rotation.z += deltaTime * (0.8 + s * 1.5 + Math.abs(lateral) * 2.0);

    // Outer halo — circular glow, expands on burst
    const haloScale = cfg.flameSize * (0.65 + s * 0.55 + flicker * 0.12) * burstMult * sizeMult;
    this._flame.scale.setScalar(haloScale);
    this._flameMat.opacity = Math.min(0.95, (0.22 + s * 0.55 + flicker * 0.08) * (1.0 + lb * 2.00));

    // Inner core — tight, high-frequency flicker, intense on burst
    const coreF = Math.sin(t * 19.3) * 0.5 + 0.5;
    const coreFactor = 0.55 + s * 0.40 + coreF * 0.08;
    this._inner.scale.setScalar(cfg.innerSize * coreFactor * (0.90 + Math.abs(lateral) * 0.12) * (1.0 + lb * 2.20) * sizeMult);
    this._innerMat.opacity = Math.min(1.0, (0.70 + s * 0.36 + coreF * 0.05) * (1.0 + lb * 1.60));

    // Star burst — spikes on letter hit
    if (this._showStarSprite) {
      const starPulse = (0.30 + s * 0.42 + flicker * 0.08) * (1.0 + lb * 3.00);
      this._star.scale.setScalar(cfg.starSize * starPulse * sizeMult);
      this._starMat.opacity = isAccelerating
        ? Math.min(1.0, (0.28 + s * 0.32 + flicker * 0.06) * (1.0 + lb * 2.80))
        : Math.min(1.0, (0.08 + s * 0.14 + flicker * 0.04) * (1.0 + lb * 2.80));
      this._starMat.rotation += deltaTime * 0.35;
    }

    // Point light — spikes on letter hit
    this._light.intensity = cfg.lightIntens * this._lightMult
      * (0.30 + s * 0.90 + flicker * 0.18)
      * (1.0 + lb * 3.00);
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
