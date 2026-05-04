// Colapso léxico — partículas que se disuelven al destruir un enemigo

import * as THREE from 'three';
import { COLORS } from '../../shared/constants.js';
import { getQualityProfile } from '../../shared/qualitySettings.js';
import { ShipDestroyFx } from './fx/ShipDestroyFx.js';

const LIFETIME           = 0.9;
const COLLAPSE_LIFETIME_V = 2.5;

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

    // Fade out + expansión
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



export class ParticleEmitter {
  constructor(scene) {
    const p = getQualityProfile();

    this.scene = scene;
    this._pool = Array.from({ length: p.particleMaxBursts }, () => {
      const b = new Burst(p.particlePerBurst);
      b.points.castShadow = false;
      b.points.receiveShadow = false;
      scene.add(b.points);
      return b;
    });
    // Free-list: stack of available indices for O(1) acquire/release.
    this._poolFree = Array.from({ length: p.particleMaxBursts }, (_, i) => i);

    const dSize = p.destroyPoolSize   ?? 4;
    const dLetters = p.destroyLetterCount ?? 8;
    this._destroyPool = Array.from({ length: dSize }, () => new ShipDestroyFx(scene, null, {}, dLetters));
    this._destroyFree = Array.from({ length: dSize }, (_, i) => i);
  }

  burst(position) {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      return;
    }
    if (this._poolFree.length === 0) return; // pool full
    this._pool[this._poolFree.pop()].activate(position);
  }

  burstDestroy(position, { color = 0x00ffcc, word = '', intensity = 1.0 } = {}) {
    if (!position || typeof position.x !== 'number') return;
    if (this._destroyFree.length === 0) return;
    const idx = this._destroyFree.pop();
    this._destroyPool[idx].spawn(position, { color, word, intensity });
  }

  update(delta) {
    for (let i = 0; i < this._pool.length; i++) {
      const b = this._pool[i];
      if (!b.active) continue;
      b.update(delta);
      if (!b.active) this._poolFree.push(i); // just expired — return to free list
    }

    for (let i = 0; i < this._destroyPool.length; i++) {
      const fx = this._destroyPool[i];
      if (fx.done) continue;
      fx.update(delta);
      if (fx.done) this._destroyFree.push(i);
    }
  }

  dispose() {
    for (const b of this._pool) {
      this.scene.remove(b.points);
      b.dispose();
    }

    for (const fx of this._destroyPool) fx.dispose();
  }
}
