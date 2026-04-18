// Cámara con perspectiva 3D real — enemigos vienen desde la profundidad

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
    this._baseY   = 4;
    this._baseZ   = 14;
  }

  init() {
    this.instance.position.set(0, this._baseY, this._baseZ);
    this.instance.lookAt(0, 0, 0);

    window.addEventListener('resize', () => {
      this.instance.aspect = window.innerWidth / window.innerHeight;
      this.instance.updateProjectionMatrix();
    });
  }

  // Leve flotación sinusoidal — da sensación de nave viva
  update(delta) {
    this._t += delta;
    this.instance.position.y = this._baseY + Math.sin(this._t * 0.25) * 0.25;
    this.instance.position.x = Math.sin(this._t * 0.15) * 0.4;
    this.instance.lookAt(0, 0, 0);
  }
}
