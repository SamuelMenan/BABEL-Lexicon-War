import * as THREE from 'three';
import { BLOOM_LAYER } from '../../shared/constants.js';

// --------------------------------------------------------------------------
// Texture factories (lazily created, globally cached)
// --------------------------------------------------------------------------

let _flameTex  = null;
let _innerTex  = null;

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

function _getFlame() { return (_flameTex ??= _buildFlameTexture()); }
function _getInner() { return (_innerTex ??= _buildInnerTexture()); }

// --------------------------------------------------------------------------
// Ship preset configs
// --------------------------------------------------------------------------
// localPosition — offset in LOCAL ship-group space to the engine nozzle.
//   In all three ships the "back" of the hull sits at +Z in local space
//   (the cone fallback geometry has its base at +Z; loaded models are
//   centred and scaled identically). Tune these values after loading the
//   actual GLB to place the effect exactly on the nozzle.
//
// bodyRadius  — half-width of the exhaust cone at its opening (nozzle end)
// bodyLength  — length of the cone along the exhaust axis
// flameSize   — diameter of the outer halo sprite
// innerSize   — diameter of the bright hot-core sprite
// lightColor  — PointLight hue
// lightIntens — baseline PointLight intensity (idle)
// lightDist   — PointLight falloff distance
// lightOffset — PointLight shift relative to root (fine-tune light origin)
// bodyColor   — exhaust cone tint
// flameColor  — outer flame sprite tint
// innerColor  — core sprite tint

export const SHIP_BOOSTER_CONFIGS = {

  // spaceshipnew.glb  |  targetLength 3.8  |  warm orange emissive on hull
  combatPlayer: {
    localPosition: new THREE.Vector3(0, 0, 1.85),
    bodyRadius:    0.13,
    bodyLength:    0.52,
    flameSize:     0.70,
    innerSize:     0.28,
    lightColor:    0x66bbff,
    lightIntens:   2.4,
    lightDist:     6.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.28),
    bodyColor:     0x88ccff,
    flameColor:    0x44aaff,
    innerColor:    0xddf0ff,
  },

  // spaceship.glb  |  targetLength 5.0  |  warm orange glow on hull
  racingPlayer: {
    localPosition: new THREE.Vector3(0, 0, 2.45),
    bodyRadius:    0.17,
    bodyLength:    0.68,
    flameSize:     0.92,
    innerSize:     0.38,
    lightColor:    0xff9933,
    lightIntens:   3.2,
    lightDist:     8.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.38),
    bodyColor:     0xffaa44,
    flameColor:    0xff8822,
    innerColor:    0xfff0dd,
  },

  // spaceship__low_poly.glb  |  targetLength 3.2  |  red hull emissive
  racingOpponent: {
    localPosition: new THREE.Vector3(0, 0, 1.58),
    bodyRadius:    0.13,
    bodyLength:    0.50,
    flameSize:     0.74,
    innerSize:     0.30,
    lightColor:    0xff4422,
    lightIntens:   2.8,
    lightDist:     7.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.26),
    bodyColor:     0xff5533,
    flameColor:    0xff3311,
    innerColor:    0xffd0c0,
  },
};

// --------------------------------------------------------------------------
// BoosterEffect
// --------------------------------------------------------------------------

export class BoosterEffect {
  /**
   * @param {object} config  One of SHIP_BOOSTER_CONFIGS or a custom object.
   */
  constructor(config = SHIP_BOOSTER_CONFIGS.racingPlayer) {
    this._t               = 0;
    this._currentStrength = 0.28;   // starts at idle level — no pop on first frame
    this._cfg             = null;

    // ---- scene-graph root (parented to the ship group) -------------------
    this._root = new THREE.Object3D();
    this._root.name = 'BoosterEffect';

    // ---- exhaust cone body -----------------------------------------------
    // Unit cone: CylinderGeometry(tipRadius=0, baseRadius=1, height=1)
    // After rotateX(π/2): cylinder axis aligns with +Z
    // After translate(0,0,0.5): base sits at Z=0 (nozzle), tip at Z=1 (exhaust end)
    // Scale is applied per-frame via mesh.scale, driven by config + flicker.
    const coneGeo = new THREE.CylinderGeometry(0, 1, 1, 8, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, 0.5);

    this._bodyMat = new THREE.MeshBasicMaterial({
      color:      0xffffff,
      transparent: true,
      opacity:    0.35,
      blending:   THREE.AdditiveBlending,
      depthWrite: false,
      side:       THREE.BackSide,     // visible from outside the cone
    });
    this._body = new THREE.Mesh(coneGeo, this._bodyMat);
    this._body.layers.enable(BLOOM_LAYER);
    this._root.add(this._body);

    // ---- outer flame halo sprite -----------------------------------------
    this._flameMat = new THREE.SpriteMaterial({
      map:        _getFlame(),
      color:      0xffffff,
      transparent: true,
      opacity:    0.72,
      blending:   THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._flame = new THREE.Sprite(this._flameMat);
    this._flame.layers.enable(BLOOM_LAYER);
    this._root.add(this._flame);

    // ---- hot-core sprite -------------------------------------------------
    this._innerMat = new THREE.SpriteMaterial({
      map:        _getInner(),
      color:      0xffffff,
      transparent: true,
      opacity:    0.90,
      blending:   THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._inner = new THREE.Sprite(this._innerMat);
    this._inner.layers.enable(BLOOM_LAYER);
    this._root.add(this._inner);

    // ---- dynamic point light ---------------------------------------------
    this._light = new THREE.PointLight(0xffffff, 1, 8);
    this._root.add(this._light);

    // Apply initial configuration
    this.setConfig(config);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Parent the booster assembly to a ship's group.
   * Call once after constructing the ship.
   * @param {THREE.Group} shipGroup  The ship's this._group
   */
  attachToShip(shipGroup) {
    if (this._root.parent) this._root.parent.remove(this._root);
    shipGroup.add(this._root);
  }

  /**
   * Switch to a different ship's config at any time.
   * Safe to call mid-session (e.g., when a model finishes loading).
   * @param {object} cfg
   */
  setConfig(cfg) {
    this._cfg = cfg;

    // Root position: engine nozzle in local ship space
    this._root.position.copy(cfg.localPosition);

    // Body baseline scale — update() multiplies on top of this
    this._body.scale.set(cfg.bodyRadius, cfg.bodyRadius, cfg.bodyLength);
    this._bodyMat.color.set(cfg.bodyColor);

    // Flame sprite
    this._flameMat.color.set(cfg.flameColor);
    this._flame.scale.setScalar(cfg.flameSize);
    this._flame.position.set(0, 0, cfg.bodyLength * 0.45);

    // Inner sprite (closer to nozzle opening)
    this._innerMat.color.set(cfg.innerColor);
    this._inner.scale.setScalar(cfg.innerSize);
    this._inner.position.set(0, 0, cfg.bodyLength * 0.12);

    // Light
    this._light.color.set(cfg.lightColor);
    this._light.intensity = cfg.lightIntens * 0.35;   // starts at idle level
    this._light.distance  = cfg.lightDist;
    this._light.position.copy(cfg.lightOffset);
  }

  /**
   * Call every frame, ideally from within the ship's own update(delta) method.
   *
   * @param {number}  deltaTime      Seconds since last frame (same delta the GameLoop provides)
   * @param {boolean} isAccelerating True when the ship is thrusting
   */
  update(deltaTime, isAccelerating) {
    this._t += deltaTime;

    const t   = this._t;
    const cfg = this._cfg;
    if (!cfg) return;

    // ------------------------------------------------------------------
    // Multi-frequency flicker
    // Three oscillators at non-harmonic frequencies prevent a mechanical
    // pattern while staying cheaper than a noise function.
    // ------------------------------------------------------------------
    const f1 = Math.sin(t * 13.1) * 0.5 + 0.5;   // fast shimmer
    const f2 = Math.sin(t *  5.7) * 0.5 + 0.5;   // medium pulse
    const f3 = Math.sin(t *  1.9) * 0.5 + 0.5;   // slow breathe
    const flicker = f1 * 0.20 + f2 * 0.48 + f3 * 0.32;   // weighted composite

    // ------------------------------------------------------------------
    // Strength: lerps between idle (dim, alive) and accel (full thrust)
    // ------------------------------------------------------------------
    const targetStrength = isAccelerating
      ? 0.72 + flicker * 0.28
      : 0.25 + flicker * 0.14;

    const lerpRate = isAccelerating ? 5.5 : 3.8;
    const alpha = Math.min(deltaTime * lerpRate, 1);
    this._currentStrength += (targetStrength - this._currentStrength) * alpha;
    const s = this._currentStrength;

    // ------------------------------------------------------------------
    // Exhaust cone
    // scale.x/y = width (radius), scale.z = length along exhaust axis
    // BackSide + AdditiveBlending → soft glow tube
    // ------------------------------------------------------------------
    const coneW = cfg.bodyRadius * (0.50 + s * 0.80);
    const coneL = cfg.bodyLength * (0.55 + s * 0.75);
    this._body.scale.set(coneW, coneW, coneL);
    this._bodyMat.opacity = 0.08 + s * 0.36;

    // ------------------------------------------------------------------
    // Outer flame sprite (wider halo, positioned along exhaust axis)
    // ------------------------------------------------------------------
    const flameFactor = 0.60 + s * 0.58 + flicker * 0.14;
    this._flame.scale.setScalar(cfg.flameSize * flameFactor);
    this._flameMat.opacity = 0.18 + s * 0.65;

    // ------------------------------------------------------------------
    // Inner core sprite (tight, high-opacity, faster flicker)
    // ------------------------------------------------------------------
    const coreF  = Math.sin(t * 19.3) * 0.5 + 0.5;   // extra-fast core shimmer
    const coreFactor = 0.68 + s * 0.42 + coreF * 0.10;
    this._inner.scale.setScalar(cfg.innerSize * coreFactor);
    this._innerMat.opacity = 0.55 + s * 0.40 + coreF * 0.05;

    // ------------------------------------------------------------------
    // Point light — intensity smoothly follows thrust strength
    // ------------------------------------------------------------------
    this._light.intensity = cfg.lightIntens * (0.30 + s * 0.90 + flicker * 0.18);
  }

  /**
   * Remove from scene and free GPU resources.
   * Call when the ship is destroyed or the scene is torn down.
   */
  dispose() {
    if (this._root.parent) this._root.parent.remove(this._root);
    this._body.geometry.dispose();
    this._bodyMat.dispose();
    this._flameMat.dispose();
    this._innerMat.dispose();
    // Shared textures (_flameTex, _innerTex) are module-level singletons;
    // do not dispose them here — other instances may still need them.
  }
}
