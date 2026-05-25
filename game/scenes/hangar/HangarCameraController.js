import * as THREE from 'three';
import { playSfx } from '../../../shared/audioManager.js';

export class HangarCameraController {
  constructor(camera) {
    this._camera = camera;
    this.focal   = new THREE.Vector3(0, 0, 0);
    this.orbit   = {
      theta: 0.4, phi: 0.28, radius: 4.5,
      isDragging: false, lastX: 0, lastY: 0,
      phiMin: -1.56, phiMax: 1.56, radiusMin: 1.8, radiusMax: 9,
    };
  }

  /** Call each frame before applyPosition. Skips key movement during deployment. */
  updateFromKeys(keys, deployActive) {
    if (deployActive) return;
    const o = this.orbit;
    const any = keys.has('a')||keys.has('A')||keys.has('d')||keys.has('D')||keys.has('w')||keys.has('W')||keys.has('s')||keys.has('S');
    if (any && !this._wasOrbitKey) playSfx('hangarCamera.orbit', 0.35);
    this._wasOrbitKey = any;
    if (keys.has('a') || keys.has('A')) o.theta -= 0.022;
    if (keys.has('d') || keys.has('D')) o.theta += 0.022;
    if (keys.has('w') || keys.has('W')) o.radius = Math.max(o.radiusMin, o.radius - 0.05);
    if (keys.has('s') || keys.has('S')) o.radius = Math.min(o.radiusMax, o.radius + 0.05);
  }

  /** Compute camera world position from orbit + focal, then apply optional shake. */
  applyPosition(shakeAmp = 0, shakeElapsed = 0) {
    const { theta, phi, radius } = this.orbit;
    const f = this.focal;
    this._camera.position.set(
      f.x + radius * Math.cos(phi) * Math.sin(theta),
      f.y + radius * Math.sin(phi),
      f.z + radius * Math.cos(phi) * Math.cos(theta),
    );
    if (shakeAmp > 0) {
      const te = shakeElapsed;
      this._camera.position.x += Math.sin(te * 47.3) * shakeAmp;
      this._camera.position.y += Math.cos(te * 61.7) * shakeAmp;
      this._camera.position.z += Math.sin(te * 53.1 + 1.3) * shakeAmp;
    }
    this._camera.lookAt(f);
  }

  startDrag(x, y) {
    this.orbit.isDragging = true;
    this.orbit.lastX = x;
    this.orbit.lastY = y;
    playSfx('hangarCamera.orbit', 0.35);
  }

  drag(x, y) {
    const o = this.orbit;
    if (!o.isDragging) return;
    o.theta -= (x - o.lastX) * 0.008;
    o.phi    = Math.max(o.phiMin, Math.min(o.phiMax, o.phi + (y - o.lastY) * 0.005));
    o.lastX  = x;
    o.lastY  = y;
  }

  endDrag() { this.orbit.isDragging = false; }

  zoom(delta) {
    const o  = this.orbit;
    o.radius = Math.max(o.radiusMin, Math.min(o.radiusMax, o.radius + delta * 0.006));
  }

  resetOrbit()   { Object.assign(this.orbit, { theta: 0.4,        phi:  0.28, radius: 4.5 }); }
  setTopView()   { Object.assign(this.orbit, { theta: 0.0,        phi:  1.56, radius: 6.0 }); }
  setBottomView(){ Object.assign(this.orbit, { theta: 0.0,        phi: -1.56, radius: 6.0 }); }
  setRearView()  { Object.assign(this.orbit, { theta: Math.PI,    phi:  0.0,  radius: 5.0 }); }
  setSideView()  { Object.assign(this.orbit, { theta: Math.PI / 2, phi: 0.0,  radius: 5.0 }); }
}
