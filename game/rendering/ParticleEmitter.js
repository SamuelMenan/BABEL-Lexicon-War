// Colapso léxico — partículas que se disuelven al destruir un enemigo

import * as THREE from 'three';
import { COLORS } from '../../shared/constants.js';
import { getQualityProfile } from '../../shared/qualitySettings.js';

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

let _glyphTex = null;
function _getGlyphTex() {
  if (_glyphTex) return _glyphTex;
  const glyphs = ['>','_','<','|','#','@','/','!','?'];
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = '#00ffcc';
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], 32, 32);
  _glyphTex = new THREE.CanvasTexture(canvas);
  return _glyphTex;
}

class CollapseShipBurst {
  constructor(collapseCount) {
    this._n = collapseCount;
    const positions = new Float32Array(collapseCount * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.mat = new THREE.PointsMaterial({
      color: 0x00ffbb,
      size: 0.40,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      map: _getGlyphTex(),
      alphaTest: 0.04,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.active = false;
    this.age = 0;
    this._vels = Array.from({ length: collapseCount }, () => new THREE.Vector3());
  }

  activate(position) {
    this.active = true;
    this.age = 0;
    this.points.position.copy(position);
    this.mat.opacity = 1;
    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < this._n; i++) {
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
      const spd = 4 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      this._vels[i].set(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.sin(phi) * Math.sin(theta) * spd,
        Math.cos(phi) * spd * 0.6,
      );
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  update(delta) {
    if (!this.active) return;
    this.age += delta;
    const t = this.age / COLLAPSE_LIFETIME_V;
    if (t >= 1) { this.active = false; this.mat.opacity = 0; return; }
    // Hold bright for first 0.3t then fade out
    this.mat.opacity = t < 0.30 ? 1 : Math.max(0, 1 - (t - 0.30) / 0.70);
    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < this._n; i++) {
      pos[i * 3]     += this._vels[i].x * delta * (1 - t * 0.6);
      pos[i * 3 + 1] += this._vels[i].y * delta * (1 - t * 0.6);
      pos[i * 3 + 2] += this._vels[i].z * delta * (1 - t * 0.6);
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() { this.geo.dispose(); this.mat.dispose(); }
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

    this._collapsePool = Array.from({ length: p.collapsePoolSize }, () => {
      const b = new CollapseShipBurst(p.collapseParticleCount);
      b.points.castShadow = false;
      b.points.receiveShadow = false;
      scene.add(b.points);
      return b;
    });
    this._collapseFree = Array.from({ length: p.collapsePoolSize }, (_, i) => i);
  }

  burst(position) {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      return;
    }
    if (this._poolFree.length === 0) return; // pool full
    this._pool[this._poolFree.pop()].activate(position);
  }

  burstCollapse(position) {
    if (!position || typeof position.x !== "number") return;
    if (this._collapseFree.length === 0) return; // all 4 slots active, skip
    this._collapsePool[this._collapseFree.pop()].activate(position);
  }

  update(delta) {
    for (let i = 0; i < this._pool.length; i++) {
      const b = this._pool[i];
      if (!b.active) continue;
      b.update(delta);
      if (!b.active) this._poolFree.push(i); // just expired — return to free list
    }
    for (let i = 0; i < this._collapsePool.length; i++) {
      const b = this._collapsePool[i];
      if (!b.active) continue;
      b.update(delta);
      if (!b.active) this._collapseFree.push(i);
    }
  }

  dispose() {
    for (const b of this._pool) {
      this.scene.remove(b.points);
      b.dispose();
    }
    for (const b of this._collapsePool) {
      this.scene.remove(b.points);
      b.dispose();
    }
  }
}
