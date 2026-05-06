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

    this._shakeIntensity = 0;
    this._shakeDuration  = 0;
    this._shakeAge       = 0;
  }

  init() {
    this.instance.position.set(0, this._baseY, this._baseZ);
    this.instance.lookAt(0, 0.5, -8);

    window.addEventListener('resize', () => {
      this.instance.aspect = window.innerWidth / window.innerHeight;
      this.instance.updateProjectionMatrix();
    });
  }

  trackX(worldX) {
    this._targetX = worldX;
  }

  // Trigger a camera shake. intensity ≈ 0.1–1.5, duration in seconds.
  shake(intensity = 0.8, duration = 0.7) {
    this._shakeIntensity = intensity;
    this._shakeDuration  = duration;
    this._shakeAge       = 0;
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

  _shakeOffset() {
    if (this._shakeAge >= this._shakeDuration) return { x: 0, y: 0 };
    this._shakeAge += 0; // advanced by caller via update
    const t   = this._shakeAge / this._shakeDuration;
    const amp = this._shakeIntensity * (1 - t);
    return {
      x: Math.sin(this._t * 53) * amp * 0.18,
      y: Math.sin(this._t * 41) * amp * 0.12,
    };
  }

  _updateCombat(delta) {
    if (this._shakeAge < this._shakeDuration) this._shakeAge += delta;

    this._currentX += (this._targetX * 0.05 - this._currentX) * Math.min(delta * 2.5, 1);

    const shake = this._shakeOffset();
    this.instance.position.x = this._currentX + shake.x;
    this.instance.position.y = this._baseY + Math.sin(this._t * 0.3) * 0.2 + shake.y;
    this.instance.position.z = this._baseZ;
    this.instance.lookAt(this._currentX * 0.15, 0.5, -8);
  }

  _updateRacing(delta) {
    const sway = Math.sin(this._t * 0.22) * 0.06;
    this.instance.position.set(sway, 1.4 + Math.sin(this._t * 0.18) * 0.05, 8);
    this.instance.lookAt(sway * 0.15, 0.8, -80);

    if (Math.abs(this.instance.fov - this._racingFOV) > 0.05) {
      this.instance.fov += (this._racingFOV - this.instance.fov) * Math.min(delta * 1.5, 1);
      this.instance.updateProjectionMatrix();
    }
  }
}
