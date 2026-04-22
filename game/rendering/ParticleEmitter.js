// Colapso léxico — partículas que se disuelven al destruir un enemigo

import * as THREE from 'three';
import { COLORS } from '../../shared/constants.js';

const MAX_BURSTS  = 12;
const PER_BURST   = 28;
const LIFETIME    = 0.9; // segundos

class Burst {
  constructor() {
    const positions = new Float32Array(PER_BURST * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.mat = new THREE.PointsMaterial({
      color:       COLORS.PARTICLE,
      size:        0.12,
      transparent: true,
      opacity:     1,
      depthWrite:  false,
    });

    this.points    = new THREE.Points(this.geo, this.mat);
    this.active    = false;
    this.age       = 0;
    this.velocities = new Array(PER_BURST).fill(null).map(() => new THREE.Vector3());
    this.origin    = new THREE.Vector3();
  }

  activate(position) {
    this.active = true;
    this.age    = 0;
    this.origin.copy(position);
    this.points.position.copy(position);
    this.mat.opacity = 1;

    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < PER_BURST; i++) {
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

    for (let i = 0; i < PER_BURST; i++) {
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
    this.scene  = scene;
    this._pool  = Array.from({ length: MAX_BURSTS }, () => {
      const b = new Burst();
      scene.add(b.points);
      return b;
    });
  }

  burst(position) {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      return;
    }
    const slot = this._pool.find(b => !b.active);
    if (!slot) return; // pool lleno, ignorar
    slot.activate(position);
  }

  update(delta) {
    for (const b of this._pool) b.update(delta);
  }

  dispose() {
    for (const b of this._pool) {
      this.scene.remove(b.points);
      b.dispose();
    }
  }
}
