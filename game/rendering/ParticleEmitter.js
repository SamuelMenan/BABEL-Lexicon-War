// Colapso lexico — particulas que se disuelven al destruir un enemigo

import * as THREE from 'three';
import { COLORS, BLOOM_LAYER } from '../../shared/constants.js';
import { getQualityProfile } from '../../shared/qualitySettings.js';
import { ShipDestroyFx } from './fx/ShipDestroyFx.js';

const LIFETIME = 0.9;

// Lore words fired as glitch debris on player death
const DEATH_LORE = ['BABEL', 'ERROR', 'NULL', 'VOID', 'CRASH', 'DATA', 'LOSS', 'DEAD', 'END'];

class Burst {
  constructor(perBurst) {
    this._n = perBurst;
    const positions = new Float32Array(perBurst * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.mat = new THREE.PointsMaterial({
      color:       COLORS.PARTICLE,
      size:        0.12,
      transparent: true,
      opacity:     1,
      depthWrite:  false,
    });

    this.points     = new THREE.Points(this.geo, this.mat);
    this.active     = false;
    this.age        = 0;
    this.velocities = Array.from({ length: perBurst }, () => new THREE.Vector3());
    this.origin     = new THREE.Vector3();
  }

  activate(position) {
    this.active = true;
    this.age    = 0;
    this.origin.copy(position);
    this.points.position.copy(position);
    this.mat.opacity = 1;

    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < this._n; i++) {
      pos[i * 3]     = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      this.velocities[i].set(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
      );
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  update(delta) {
    if (!this.active) return;

    this.age += delta;
    const t = this.age / LIFETIME;

    if (t >= 1) {
      this.active      = false;
      this.mat.opacity = 0;
      return;
    }

    this.mat.opacity = 1 - t;
    const pos = this.geo.attributes.position.array;

    for (let i = 0; i < this._n; i++) {
      pos[i * 3]     += this.velocities[i].x * delta * (1 - t * 0.6);
      pos[i * 3 + 1] += this.velocities[i].y * delta * (1 - t * 0.6);
      pos[i * 3 + 2] += this.velocities[i].z * delta * (1 - t * 0.6);
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}

// Expanding shockwave ring — spawned on player death for dramatic onda expansiva.
class ShockwaveRing {
  constructor(scene) {
    this._scene    = scene;
    this._duration = 0.85;
    this._maxScale = 7.0;       // base (combat). activate(pos, color, scale) lo escala.
    this._curMaxScale = 7.0;
    this._curStart    = 0.15;
    this._active   = false;
    this._age      = 0;

    const geo = new THREE.RingGeometry(0.82, 1.0, 52);
    const mat = new THREE.MeshBasicMaterial({
      color:       0x00ffcc,
      transparent: true,
      opacity:     1,
      side:        THREE.DoubleSide,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });
    this._mesh = new THREE.Mesh(geo, mat);
    this._mesh.layers.enable(BLOOM_LAYER);
    this._mesh.rotation.x = -Math.PI / 2;
  }

  activate(position, color = 0x00ffcc, scale = 1.0) {
    this._active = true;
    this._age    = 0;
    this._curStart    = 0.15 * scale;
    this._curMaxScale = this._maxScale * scale;
    this._mesh.material.color.setHex(color);
    this._mesh.material.opacity = 0.9;
    this._mesh.scale.setScalar(this._curStart);
    this._mesh.position.copy(position);
    this._scene.add(this._mesh);
  }

  update(delta) {
    if (!this._active) return;
    this._age += delta;
    const t = this._age / this._duration;
    if (t >= 1) {
      this._active = false;
      if (this._mesh.parent) this._scene.remove(this._mesh);
      return;
    }
    const eased = 1 - (1 - t) * (1 - t);
    this._mesh.scale.setScalar(this._curStart + eased * this._curMaxScale);
    this._mesh.material.opacity = (1 - t) * 0.85;
  }

  get done() { return !this._active; }

  dispose() {
    if (this._mesh.parent) this._scene.remove(this._mesh);
    this._mesh.geometry.dispose();
    this._mesh.material.dispose();
  }
}


export class ParticleEmitter {
  constructor(scene) {
    const p = getQualityProfile();

    this.scene = scene;
    this._pool = Array.from({ length: p.particleMaxBursts }, () => {
      const b = new Burst(p.particlePerBurst);
      b.points.castShadow    = false;
      b.points.receiveShadow = false;
      scene.add(b.points);
      return b;
    });
    this._poolFree = Array.from({ length: p.particleMaxBursts }, (_, i) => i);

    const dSize    = p.destroyPoolSize    ?? 6;
    const dLetters = p.destroyLetterCount ?? 8;
    this._destroyPool = Array.from({ length: dSize }, () => new ShipDestroyFx(scene, null, {}, dLetters));
    this._destroyFree = Array.from({ length: dSize }, (_, i) => i);

    // Two rings for double-wave shockwave on player death
    this._rings = [new ShockwaveRing(scene), new ShockwaveRing(scene)];

    this._deathTimers = [];
  }

  burst(position) {
    if (!position || typeof position.x !== 'number') return;
    if (this._poolFree.length === 0) return;
    this._pool[this._poolFree.pop()].activate(position);
  }

  // colorRamp: array of hex numbers from normalRamp, or null to use color scalar.
  burstDestroy(position, { color = 0x00ffcc, colorRamp = null, word = '', intensity = 1.0 } = {}) {
    if (!position || typeof position.x !== 'number') return;
    if (this._destroyFree.length === 0) return;
    const idx = this._destroyFree.pop();
    this._destroyPool[idx].spawn(position, { color, colorRamp, word, intensity });
  }

  // Full cinematic death sequence for the player ship.
  // colorRamp: normalRamp from the ship's booster config (array of hex).
  // scale: 1.0 = tamano combat. Reducir para naves mas pequeñas (hangar ~0.45).
  playerDeathSequence(position, colorRamp = null, scale = 1.0) {
    if (!position) return;
    this._clearDeathTimers();

    const pos = position.clone();
    const s = scale;

    // Derive ring colors from ramp: first ring uses brightest (index 0), second uses mid
    const ringColor1 = Array.isArray(colorRamp) && colorRamp.length > 0
      ? colorRamp[0] : 0xffffff;
    const ringColor2 = Array.isArray(colorRamp) && colorRamp.length > 4
      ? colorRamp[4] : 0x00ffcc;

    // T=0 — massive flash burst at center
    this.burstDestroy(pos.clone(), { colorRamp, word: DEATH_LORE[0], intensity: 2.2 * s });
    this.burst(pos.clone());
    this.burst(pos.clone());

    // T=0 — first shockwave ring (brightest ramp color)
    if (this._rings[0].done) this._rings[0].activate(pos.clone(), ringColor1, s);

    const offsets = [
      new THREE.Vector3(-0.7 * s,  0.35 * s,  0.0),
      new THREE.Vector3( 0.7 * s, -0.25 * s,  0.0),
      new THREE.Vector3( 0.0,      0.55 * s, -0.1 * s),
      new THREE.Vector3(-0.3 * s, -0.5  * s,  0.1 * s),
    ];

    // T=120-400ms — scatter bursts with lore words, all using ship color ramp
    offsets.forEach((off, i) => {
      const t = this._later(120 + i * 70, () => {
        const p = pos.clone().add(off);
        this.burstDestroy(p, {
          colorRamp,
          word:      DEATH_LORE[(i + 1) % DEATH_LORE.length],
          intensity: (1.1 + (0.3 - i * 0.05)) * s,
        });
        this.burst(p);
      });
      this._deathTimers.push(t);
    });

    // T=280ms — second shockwave ring (mid ramp color)
    this._deathTimers.push(this._later(280, () => {
      if (this._rings[1].done) this._rings[1].activate(pos.clone(), ringColor2, s);
    }));

    // T=500ms — final ember burst
    this._deathTimers.push(this._later(500, () => {
      this.burstDestroy(pos.clone(), { colorRamp, word: DEATH_LORE[8], intensity: 0.9 * s });
      this.burst(pos.clone());
    }));
  }

  _later(ms, fn) {
    return setTimeout(fn, ms);
  }

  _clearDeathTimers() {
    this._deathTimers.forEach(t => clearTimeout(t));
    this._deathTimers = [];
  }

  update(delta) {
    for (let i = 0; i < this._pool.length; i++) {
      const b = this._pool[i];
      if (!b.active) continue;
      b.update(delta);
      if (!b.active) this._poolFree.push(i);
    }

    for (let i = 0; i < this._destroyPool.length; i++) {
      const fx = this._destroyPool[i];
      if (fx.done) continue;
      fx.update(delta);
      if (fx.done) this._destroyFree.push(i);
    }

    for (const ring of this._rings) ring.update(delta);
  }

  dispose() {
    this._clearDeathTimers();
    for (const b of this._pool) {
      this.scene.remove(b.points);
      b.dispose();
    }
    for (const fx of this._destroyPool) fx.dispose();
    for (const ring of this._rings) ring.dispose();
  }
}
