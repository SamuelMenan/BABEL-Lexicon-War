import * as THREE from 'three';

// Anillo aditivo que expande y se desvanece. Auto-destruct al expirar.
// Plano XZ, centrado en `position`. Tinte de paleta (flameColor → blanco).

export class Shockwave {
  constructor(scene, position, { palette = null, size = 3.0, life = 0.6 } = {}) {
    this._scene = scene;
    this._t     = 0;
    this._life  = life;
    this._size  = size;

    const baseHex = palette?.flameColor ?? palette?.hangarColor ?? 0xffaa55;

    // Ring radii (inner=0 to feel like a disc shockwave that hollows out).
    this._geo = new THREE.RingGeometry(0.01, 0.04, 48, 1);
    this._geo.rotateX(-Math.PI / 2); // plano XZ
    this._mat = new THREE.MeshBasicMaterial({
      color:        baseHex,
      transparent:  true,
      opacity:      0.95,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      side:         THREE.DoubleSide,
      toneMapped:   false,
    });
    this._mesh = new THREE.Mesh(this._geo, this._mat);
    this._mesh.position.copy(position);
    this._mesh.renderOrder = 9990;
    this._scene.add(this._mesh);

    this._tick = this._tick.bind(this);
    this._lastT = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  _tick() {
    const now = performance.now();
    const dt  = (now - this._lastT) / 1000;
    this._lastT = now;
    this._t += dt;

    const k = this._t / this._life;
    if (k >= 1) { this.dispose(); return; }

    // Easing: rapido al inicio, suaviza al final.
    const ease = 1 - Math.pow(1 - k, 2.4);
    const scale = 0.2 + ease * this._size;
    this._mesh.scale.set(scale, 1, scale);
    this._mat.opacity = 0.95 * (1 - k) * (1 - k * 0.3);

    this._raf = requestAnimationFrame(this._tick);
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._mesh) this._scene.remove(this._mesh);
    this._geo?.dispose();
    this._mat?.dispose();
    this._mesh = null;
  }
}
