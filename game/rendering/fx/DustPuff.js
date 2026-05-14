import * as THREE from 'three';

// Polvo levantado bajo la nave durante ignición. Points aditivos suaves
// que expanden radialmente en plano XZ y caen ligeramente. One-shot.

const PARTICLES = 110;
const LIFE_S    = 1.2;
const RADIUS_0  = 0.3;
const SPREAD    = 4.5;
const RISE      = 0.6;

export class DustPuff {
  constructor(scene, position, { palette = null } = {}) {
    this._scene = scene;
    this._t = 0;
    this._done = false;

    const tint = palette?.hangarColor ?? 0x99aabb;

    this._pos  = new Float32Array(PARTICLES * 3);
    this._vel  = new Float32Array(PARTICLES * 3);
    this._seed = new Float32Array(PARTICLES);

    for (let i = 0; i < PARTICLES; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r0  = RADIUS_0 * (0.5 + Math.random() * 0.5);
      this._pos[i * 3]     = position.x + Math.cos(ang) * r0;
      this._pos[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.1;
      this._pos[i * 3 + 2] = position.z + Math.sin(ang) * r0;
      const sp = 0.6 + Math.random() * 2.2;
      this._vel[i * 3]     = Math.cos(ang) * sp;
      this._vel[i * 3 + 1] = 0.2 + Math.random() * RISE;
      this._vel[i * 3 + 2] = Math.sin(ang) * sp;
      this._seed[i] = Math.random();
    }

    this._geo = new THREE.BufferGeometry();
    this._geo.setAttribute('position', new THREE.BufferAttribute(this._pos, 3));

    this._mat = new THREE.PointsMaterial({
      color:        tint,
      size:         0.32,
      sizeAttenuation: true,
      transparent:  true,
      opacity:      0.55,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      toneMapped:   false,
    });
    this._mesh = new THREE.Points(this._geo, this._mat);
    this._scene.add(this._mesh);
  }

  update(dt) {
    if (this._done) return;
    this._t += dt;
    const k = this._t / LIFE_S;
    if (k >= 1) { this.dispose(); return; }

    const decel = Math.max(0, 1 - k * 1.2);
    for (let i = 0; i < PARTICLES; i++) {
      this._pos[i * 3]     += this._vel[i * 3]     * dt * decel;
      this._pos[i * 3 + 1] += this._vel[i * 3 + 1] * dt * decel - dt * 0.4 * k;
      this._pos[i * 3 + 2] += this._vel[i * 3 + 2] * dt * decel;
    }
    this._geo.attributes.position.needsUpdate = true;
    this._mat.opacity = 0.55 * (1 - k) * (1 - k);
    this._mat.size    = 0.32 + k * SPREAD * 0.05;
  }

  dispose() {
    if (this._done) return;
    this._done = true;
    if (this._mesh) this._scene.remove(this._mesh);
    this._geo?.dispose();
    this._mat?.dispose();
    this._mesh = null;
  }
}
