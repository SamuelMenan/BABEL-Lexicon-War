import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR } from '../../shared/constants.js';

export class Camera {
  constructor() {
    this.instance = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    this._t       = 0;
    this._baseY   = 2;
    this._baseZ   = 8;
    this._targetX = 0;   // X mundial del enemigo objetivo
    this._currentX = 0;  // X interpolada de la cámara
  }

  init() {
    this.instance.position.set(0, this._baseY, this._baseZ);
    this.instance.lookAt(0, 1, -6);

    window.addEventListener('resize', () => {
      this.instance.aspect = window.innerWidth / window.innerHeight;
      this.instance.updateProjectionMatrix();
    });
  }

  // Llamar desde SceneManager cuando cambia el objetivo
  trackX(worldX) {
    this._targetX = worldX;
  }

  update(delta) {
    this._t += delta;
    // Lerp suave hacia X del objetivo (escala reducida — no seguir 1:1)
    this._currentX += (this._targetX * 0.05 - this._currentX) * Math.min(delta * 2.5, 1);
    this.instance.position.x = this._currentX;
    this.instance.position.y = this._baseY + Math.sin(this._t * 0.3) * 0.2;
    this.instance.position.z = this._baseZ;
    this.instance.lookAt(this._currentX * 0.15, 1, -6);
  }
}
