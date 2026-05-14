import * as THREE from 'three';

// Plano aditivo blanco anclado a la cámara. Pico al inicio de warp (T3),
// decae rápido. No requiere shader/composer pass — sólo overlay geométrico.

const FADE_IN_S  = 0.08;
const FADE_OUT_S = 0.45;

export class WarpFlash {
  constructor(scene, camera) {
    this._scene  = scene;
    this._camera = camera;
    this._t = 0;
    this._life = FADE_IN_S + FADE_OUT_S;
    this._done = false;

    this._geo = new THREE.PlaneGeometry(20, 20);
    this._mat = new THREE.MeshBasicMaterial({
      color:        0xffffff,
      transparent:  true,
      opacity:      0,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      depthTest:    false,
      toneMapped:   false,
    });
    this._mesh = new THREE.Mesh(this._geo, this._mat);
    this._mesh.renderOrder = 99999;
    this._mesh.frustumCulled = false;
    scene.add(this._mesh);

    this._tmpFwd = new THREE.Vector3();
  }

  update(dt) {
    if (this._done) return;
    this._t += dt;
    let op;
    if (this._t < FADE_IN_S) {
      op = (this._t / FADE_IN_S) * 0.85;
    } else if (this._t < this._life) {
      const k = (this._t - FADE_IN_S) / FADE_OUT_S;
      op = 0.85 * (1 - k) * (1 - k);
    } else {
      this.dispose();
      return;
    }
    this._mat.opacity = op;

    // Mantener el plano pegado a la cámara, mirando hacia ella.
    this._camera.getWorldDirection(this._tmpFwd);
    this._mesh.position.copy(this._camera.position).addScaledVector(this._tmpFwd, 0.5);
    this._mesh.quaternion.copy(this._camera.quaternion);
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
