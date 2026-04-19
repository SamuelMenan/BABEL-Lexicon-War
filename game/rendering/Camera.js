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
    this._t          = 0;
    this._baseY      = 2;
    this._baseZ      = 8;
    this._targetX    = 0;
    this._currentX   = 0;
    this._racingMode = false;
    this._racingFOV  = CAMERA_FOV;
  }

  init() {
    this.instance.position.set(0, this._baseY, this._baseZ);
    this.instance.lookAt(0, 1, -6);

    window.addEventListener('resize', () => {
      this.instance.aspect = window.innerWidth / window.innerHeight;
      this.instance.updateProjectionMatrix();
    });
  }

  trackX(worldX) {
    this._targetX = worldX;
  }

  setRacingMode(enabled) {
    this._racingMode = enabled;
    if (!enabled) {
      this.instance.fov = CAMERA_FOV;
      this.instance.updateProjectionMatrix();
      this._targetX  = 0;
      this._currentX = 0;
    }
  }

  setRacingFOV(targetFOV) {
    this._racingFOV = targetFOV;
  }

  update(delta) {
    this._t += delta;
    if (this._racingMode) {
      this._updateRacing(delta);
    } else {
      this._updateCombat(delta);
    }
  }

  _updateCombat(delta) {
    this._currentX += (this._targetX * 0.05 - this._currentX) * Math.min(delta * 2.5, 1);
    this.instance.position.x = this._currentX;
    this.instance.position.y = this._baseY + Math.sin(this._t * 0.3) * 0.2;
    this.instance.position.z = this._baseZ;
    this.instance.lookAt(this._currentX * 0.15, 1, -6);
  }

  _updateRacing(delta) {
    // Gentle sway while racing through tunnel
    const sway = Math.sin(this._t * 0.22) * 0.06;
    this.instance.position.set(sway, 1.4 + Math.sin(this._t * 0.18) * 0.05, 8);
    this.instance.lookAt(sway * 0.15, 0.8, -80);

    // Smooth FOV towards target
    if (Math.abs(this.instance.fov - this._racingFOV) > 0.05) {
      this.instance.fov += (this._racingFOV - this.instance.fov) * Math.min(delta * 1.5, 1);
      this.instance.updateProjectionMatrix();
    }
  }
}
