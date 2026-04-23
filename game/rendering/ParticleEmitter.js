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

let _glyphTex = null;
function _getGlyphTex() {
  if (_glyphTex) return _glyphTex;
  const glyphs = ">_<|#";
  const canvas = document.createElement("canvas");
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 32, 32);
  ctx.fillStyle = "#00ffbb";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], 16, 16);
  _glyphTex = new THREE.CanvasTexture(canvas);
  return _glyphTex;
}

const COLLAPSE_COUNT = 22;
const COLLAPSE_LIFETIME = 1.1;

class CollapseShipBurst {
  constructor() {
    const positions = new Float32Array(COLLAPSE_COUNT * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.mat = new THREE.PointsMaterial({
      color: 0x00ffbb,
      size: 0.22,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      map: null,
      alphaTest: 0.05,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.active = false;
    this.age = 0;
    this._vels = Array.from({ length: COLLAPSE_COUNT }, () => new THREE.Vector3());
  }

  activate(position) {
    this.mat.map = _getGlyphTex();
    this.mat.needsUpdate = true;
    this.active = true;
    this.age = 0;
    this.points.position.copy(position);
    this.mat.opacity = 1;
    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < COLLAPSE_COUNT; i++) {
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
      this._vels[i].set(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 5,
      );
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  update(delta) {
    if (!this.active) return;
    this.age += delta;
    const t = this.age / COLLAPSE_LIFETIME;
    if (t >= 1) { this.active = false; this.mat.opacity = 0; return; }
    this.mat.opacity = t < 0.25 ? 1 : Math.max(0, 1 - (t - 0.25) / 0.75);
    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < COLLAPSE_COUNT; i++) {
      pos[i * 3]     += this._vels[i].x * delta * (1 - t * 0.5);
      pos[i * 3 + 1] += this._vels[i].y * delta * (1 - t * 0.5);
      pos[i * 3 + 2] += this._vels[i].z * delta * (1 - t * 0.5);
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

export class ParticleEmitter {
  constructor(scene) {
    this.scene  = scene;
    this._pool  = Array.from({ length: MAX_BURSTS }, () => {
      const b = new Burst();
      scene.add(b.points);
      return b;
    });
    this._collapseSlot = new CollapseShipBurst();
    scene.add(this._collapseSlot.points);
  }

  burst(position) {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      return;
    }
    const slot = this._pool.find(b => !b.active);
    if (!slot) return; // pool lleno, ignorar
    slot.activate(position);
  }

  burstCollapse(position) {
    if (!position || typeof position.x !== "number") return;
    this._collapseSlot.activate(position);
  }

  update(delta) {
    for (const b of this._pool) b.update(delta);
    this._collapseSlot.update(delta);
  }

  dispose() {
    for (const b of this._pool) {
      this.scene.remove(b.points);
      b.dispose();
    }
    this.scene.remove(this._collapseSlot.points);
    this._collapseSlot.dispose();
  }
}
