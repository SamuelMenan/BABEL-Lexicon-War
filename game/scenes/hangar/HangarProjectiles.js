import * as THREE from 'three';
import { PROJECTILE_DEFAULTS } from '../../rendering/booster/MuzzleConfig.js';

const POOL_MAX = 64;

// Bolt dimensions (scene units)
const BOLT_LENGTH      = 0.24;
const CORE_RADIUS      = 0.007;
const GLOW_RADIUS      = 0.022;
const HALO_RADIAL      = 1.4;
const HALO_LONG        = 1.1;

// Cylinder default axis is +Y; rotate to align with bolt forward (+Z local).
const ALIGN_AXIS = new THREE.Vector3(0, 1, 0);

export class HangarProjectiles {
  constructor(scene) {
    this._scene = scene;

    // Shared geometries — cylinders aligned along Y, length BOLT_LENGTH.
    // openEnded=false: endcaps so bolt is visible head-on (e.g. camera looking down barrel from rear).
    this._coreGeo = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, BOLT_LENGTH, 10, 1, false);
    this._glowGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, BOLT_LENGTH, 12, 1, false);
    this._haloGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, BOLT_LENGTH * 1.15, 12, 1, false);

    // Material cache keyed by color.
    this._coreMats = new Map();
    this._glowMats = new Map();
    this._haloMats = new Map();

    this._active = [];
    this._pool   = [];
  }

  _coreMat(color) {
    let m = this._coreMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color,                          // ship-palette tint (additive saturates to white at center)
        transparent:  true,
        opacity:      1.0,
        blending:     THREE.AdditiveBlending,
        depthWrite:   false,
        depthTest:    true,
        toneMapped:   false,
      });
      this._coreMats.set(color, m);
    }
    return m;
  }

  _glowMat(color) {
    let m = this._glowMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color,
        transparent:  true,
        opacity:      0.55,
        blending:     THREE.AdditiveBlending,
        depthWrite:   false,
        depthTest:    true,
        toneMapped:   false,
        side:         THREE.DoubleSide,
      });
      this._glowMats.set(color, m);
    }
    return m;
  }

  _haloMat(color) {
    let m = this._haloMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color,
        transparent:  true,
        opacity:      0.35,
        blending:     THREE.AdditiveBlending,
        depthWrite:   false,
        depthTest:    true,
        toneMapped:   false,
      });
      this._haloMats.set(color, m);
    }
    return m;
  }

  _acquireBolt(color) {
    let bolt = this._pool.pop();
    if (!bolt) {
      const root = new THREE.Group();
      const core = new THREE.Mesh(this._coreGeo, this._coreMat(color));
      const glow = new THREE.Mesh(this._glowGeo, this._glowMat(color));
      const halo = new THREE.Mesh(this._haloGeo, this._haloMat(color));
      halo.scale.set(HALO_RADIAL, HALO_LONG, HALO_RADIAL);
      halo.material.side = THREE.DoubleSide;
      root.add(glow);
      root.add(core);
      root.add(halo);
      root.renderOrder = 9999;
      core.renderOrder = 9999;
      glow.renderOrder = 9998;
      halo.renderOrder = 9997;
      bolt = { root, core, glow, halo };
    } else {
      bolt.core.material = this._coreMat(color);
      bolt.glow.material = this._glowMat(color);
      bolt.halo.material = this._haloMat(color);
    }
    this._scene.add(bolt.root);
    return bolt;
  }

  spawn(originWorld, dirWorld, opts = {}) {
    if (this._active.length >= POOL_MAX) return;
    const speed    = opts.speed    ?? PROJECTILE_DEFAULTS.speed;
    const ttl      = opts.ttl      ?? PROJECTILE_DEFAULTS.ttl;
    const color    = opts.color    ?? 0xff2222;
    const scale    = opts.scale    ?? 1.0;

    const bolt = this._acquireBolt(color);
    bolt.root.position.copy(originWorld);
    bolt.root.scale.setScalar(scale);

    const dir = dirWorld.clone().normalize();
    bolt.root.quaternion.setFromUnitVectors(ALIGN_AXIS, dir);

    const velocity = dir.multiplyScalar(speed);

    this._active.push({
      bolt,
      velocity,
      ttl,
      maxTtl: ttl,
      origin: originWorld.clone(),
    });
  }

  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.bolt.root.position.addScaledVector(p.velocity, dt);
      p.ttl -= dt;

      // Slight halo pulse for life.
      const t = 1 - (p.ttl / p.maxTtl);
      const pulse = 1.0 + 0.12 * Math.sin(t * 20);
      p.bolt.halo.scale.set(HALO_RADIAL * pulse, HALO_LONG, HALO_RADIAL * pulse);

      const dist2 = p.bolt.root.position.distanceToSquared(p.origin);
      const limit = PROJECTILE_DEFAULTS.maxDist;
      if (p.ttl <= 0 || dist2 > limit * limit) {
        this._scene.remove(p.bolt.root);
        this._pool.push(p.bolt);
        this._active.splice(i, 1);
      }
    }
  }

  clear() {
    this._active.forEach(p => {
      this._scene.remove(p.bolt.root);
      this._pool.push(p.bolt);
    });
    this._active.length = 0;
  }

  dispose() {
    this.clear();
    this._pool.forEach(b => this._scene.remove(b.root));
    this._pool.length = 0;
    this._coreGeo.dispose();
    this._glowGeo.dispose();
    this._haloGeo.dispose();
    this._coreMats.forEach(m => m.dispose()); this._coreMats.clear();
    this._glowMats.forEach(m => m.dispose()); this._glowMats.clear();
    this._haloMats.forEach(m => m.dispose()); this._haloMats.clear();
  }
}
