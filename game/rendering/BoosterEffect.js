import * as THREE from 'three';
import { BLOOM_LAYER } from '../../shared/constants.js';

// --------------------------------------------------------------------------
// Texture factories (lazily created, globally cached)
// --------------------------------------------------------------------------

let _flameTex = null;
let _innerTex = null;
let _starTex  = null;

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

// Star/cross burst — 4-axis spike pattern with soft core.
// Produces the distinctive lens-flare cross when bloom radius is high.
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

  // Main cross (horizontal + vertical)
  drawStreak(0,             size * 0.49, size * 0.024);
  drawStreak(Math.PI / 2,   size * 0.49, size * 0.024);
  // Diagonal cross — shorter, softer
  drawStreak(Math.PI / 4,   size * 0.37, size * 0.015);
  drawStreak(-Math.PI / 4,  size * 0.37, size * 0.015);

  // Soft core glow on top
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

// --------------------------------------------------------------------------
// Ship preset configs
// --------------------------------------------------------------------------

export const SHIP_BOOSTER_CONFIGS = {

  // spaceshipnew.glb  |  targetLength 3.8  |  warm orange emissive on hull
  combatPlayer: {
    localPosition: new THREE.Vector3(0, 0, 1.85),
    bodyRadius:    0.18,
    bodyLength:    0.70,
    flameSize:     1.40,
    innerSize:     0.55,
    starSize:      2.20,
    lightColor:    0x66bbff,
    lightIntens:   5.5,
    lightDist:     10.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    bodyColor:     0x88ccff,
    flameColor:    0x44aaff,
    innerColor:    0xddf0ff,
    starColor:     0x66ccff,
  },

  // spaceship.glb  |  targetLength 5.0  |  warm orange glow on hull
  racingPlayer: {
    localPosition: new THREE.Vector3(0, 0, 2.45),
    bodyRadius:    0.22,
    bodyLength:    0.88,
    flameSize:     1.85,
    innerSize:     0.75,
    starSize:      2.90,
    lightColor:    0xff9933,
    lightIntens:   6.5,
    lightDist:     12.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.45),
    bodyColor:     0xffaa44,
    flameColor:    0xff8822,
    innerColor:    0xfff0dd,
    starColor:     0xffbb55,
  },

  // spaceship__low_poly.glb  |  targetLength 3.2  |  red hull emissive
  racingOpponent: {
    localPosition: new THREE.Vector3(0, 0, 1.58),
    bodyRadius:    0.16,
    bodyLength:    0.65,
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

    this._root = new THREE.Object3D();
    this._root.name = 'BoosterEffect';

    // Exhaust cone body
    const coneGeo = new THREE.CylinderGeometry(0, 1, 1, 8, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, 0.5);

    this._bodyMat = new THREE.MeshBasicMaterial({
      color:       0xffffff,
      transparent: true,
      opacity:     0.35,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      side:        THREE.BackSide,
    });
    this._body = new THREE.Mesh(coneGeo, this._bodyMat);
    this._body.layers.enable(BLOOM_LAYER);
    this._root.add(this._body);

    // Outer flame halo sprite
    this._flameMat = new THREE.SpriteMaterial({
      map:         _getFlame(),
      color:       0xffffff,
      transparent: true,
      opacity:     0.72,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    this._flame = new THREE.Sprite(this._flameMat);
    this._flame.layers.enable(BLOOM_LAYER);
    this._root.add(this._flame);

    // Hot-core sprite
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

    // Star/cross burst sprite — driven by bloom for wide spike glow
    this._starMat = new THREE.SpriteMaterial({
      map:         _getStar(),
      color:       0xffffff,
      transparent: true,
      opacity:     0.85,
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

    this.setConfig(config);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  attachToShip(shipGroup) {
    if (this._root.parent) this._root.parent.remove(this._root);
    shipGroup.add(this._root);
  }

  setConfig(cfg) {
    this._cfg = cfg;

    this._root.position.copy(cfg.localPosition);

    this._body.scale.set(cfg.bodyRadius, cfg.bodyRadius, cfg.bodyLength);
    this._bodyMat.color.set(cfg.bodyColor);

    this._flameMat.color.set(cfg.flameColor);
    this._flame.scale.setScalar(cfg.flameSize);
    this._flame.position.set(0, 0, cfg.bodyLength * 0.45);

    this._innerMat.color.set(cfg.innerColor);
    this._inner.scale.setScalar(cfg.innerSize);
    this._inner.position.set(0, 0, cfg.bodyLength * 0.12);

    this._starMat.color.set(cfg.starColor);
    this._star.scale.setScalar(cfg.starSize);
    this._star.position.set(0, 0, cfg.bodyLength * 0.20);

    this._light.color.set(cfg.lightColor);
    this._light.intensity = cfg.lightIntens * 0.35;
    this._light.distance  = cfg.lightDist;
    this._light.position.copy(cfg.lightOffset);
  }

  update(deltaTime, isAccelerating) {
    this._t += deltaTime;

    const t   = this._t;
    const cfg = this._cfg;
    if (!cfg) return;

    // Multi-frequency flicker
    const f1 = Math.sin(t * 13.1) * 0.5 + 0.5;
    const f2 = Math.sin(t *  5.7) * 0.5 + 0.5;
    const f3 = Math.sin(t *  1.9) * 0.5 + 0.5;
    const flicker = f1 * 0.20 + f2 * 0.48 + f3 * 0.32;

    // Strength lerp
    const targetStrength = isAccelerating
      ? 0.72 + flicker * 0.28
      : 0.25 + flicker * 0.14;

    const lerpRate = isAccelerating ? 5.5 : 3.8;
    const alpha = Math.min(deltaTime * lerpRate, 1);
    this._currentStrength += (targetStrength - this._currentStrength) * alpha;
    const s = this._currentStrength;

    // Exhaust cone
    const coneW = cfg.bodyRadius * (0.50 + s * 0.80);
    const coneL = cfg.bodyLength * (0.55 + s * 0.75);
    this._body.scale.set(coneW, coneW, coneL);
    this._bodyMat.opacity = 0.08 + s * 0.36;

    // Outer flame sprite
    const flameFactor = 0.60 + s * 0.58 + flicker * 0.14;
    this._flame.scale.setScalar(cfg.flameSize * flameFactor);
    this._flameMat.opacity = 0.18 + s * 0.65;

    // Inner core sprite
    const coreF = Math.sin(t * 19.3) * 0.5 + 0.5;
    const coreFactor = 0.68 + s * 0.42 + coreF * 0.10;
    this._inner.scale.setScalar(cfg.innerSize * coreFactor);
    this._innerMat.opacity = 0.55 + s * 0.40 + coreF * 0.05;

    // Star burst sprite — slow rotation + pulse on thrust
    const starPulse = 0.55 + s * 0.65 + flicker * 0.12;
    this._star.scale.setScalar(cfg.starSize * starPulse);
    this._starMat.opacity = isAccelerating
      ? 0.50 + s * 0.45 + flicker * 0.08
      : 0.15 + s * 0.20 + flicker * 0.05;
    this._starMat.rotation += deltaTime * 0.35;

    // Point light
    this._light.intensity = cfg.lightIntens * (0.30 + s * 0.90 + flicker * 0.18);
  }

  dispose() {
    if (this._root.parent) this._root.parent.remove(this._root);
    this._body.geometry.dispose();
    this._bodyMat.dispose();
    this._flameMat.dispose();
    this._innerMat.dispose();
    this._starMat.dispose();
  }
}
