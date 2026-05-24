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
    // Chase target (player ship pos) + look-at target (vortex/forward).
    this._racingTarget   = new THREE.Vector3(0, 0, -55);
    this._racingLookAt   = new THREE.Vector3(0, 0, -180);
    this._racingCamPos   = new THREE.Vector3(0, 1.4, 8);
    this._racingVoidPhase = 0; // 0..1 — boost cinematico para void anim

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

  // Chase target: pos del jugador (camara lo sigue desde +Z atras).
  setRacingChaseTarget(pos) { if (pos) this._racingTarget.copy(pos); }

  // Punto al que mira la camara (tipicamente el vortice).
  setRacingLookAt(pos) { if (pos) this._racingLookAt.copy(pos); }

  // 0 = normal, 1 = ganador entra al hole (zoom in extremo).
  setRacingVoidPhase(v) { this._racingVoidPhase = Math.max(0, Math.min(1, v)); }

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
    // Chase cam: 6u detras del player, 1.4u arriba, con sway suave.
    const sway = Math.sin(this._t * 0.22) * 0.06;
    const bob  = Math.sin(this._t * 0.18) * 0.05;
    // Chase X muy suave para preservar simetria visual entre naves (≈0.15).
    const tx = this._racingTarget.x * 0.15 + sway;
    const ty = this._racingTarget.y * 0.35 + 1.4 + bob;
    const tz = this._racingTarget.z + 6;                  // 6u detras del player
    // Lerp suave hacia target pos para evitar jitter.
    const k = Math.min(delta * 4.5, 1);
    this._racingCamPos.x += (tx - this._racingCamPos.x) * k;
    this._racingCamPos.y += (ty - this._racingCamPos.y) * k;
    this._racingCamPos.z += (tz - this._racingCamPos.z) * k;
    this.instance.position.copy(this._racingCamPos);

    // Mirar al vortice (lookAt fijo o el provisto por scene manager).
    this.instance.lookAt(this._racingLookAt.x, this._racingLookAt.y, this._racingLookAt.z);

    // Banking lateral suave: tilt Z segun offset X del player.
    this.instance.rotation.z += this._racingTarget.x * -0.012;

    // FOV: combina target externo (setRacingFOV) + boost void anim.
    const baseFOV = this._racingFOV;
    const voidBoost = this._racingVoidPhase * 25;   // hasta +25° de zoom-out en void anim
    const desiredFOV = baseFOV + voidBoost;
    if (Math.abs(this.instance.fov - desiredFOV) > 0.05) {
      this.instance.fov += (desiredFOV - this.instance.fov) * Math.min(delta * 1.5, 1);
      this.instance.updateProjectionMatrix();
    }
  }
}
