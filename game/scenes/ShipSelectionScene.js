import * as THREE from 'three';
import { SHIPS } from '../../shared/constants.js';
import { ShipDestroyFx } from '../rendering/fx/ShipDestroyFx.js';
import { HangarRenderer } from './hangar/HangarRenderer.js';
import { HangarCameraController } from './hangar/HangarCameraController.js';
import { HangarLoader } from './hangar/HangarLoader.js';
import { DeploymentAnimator } from './hangar/DeploymentAnimator.js';

// Adjusts vertical spawn position of all ships. Negative = lower, positive = higher.
const SHIP_SPAWN_OFFSET = { x: 0, y: -0.1, z: 0 };

export class ShipSelectionScene {
  constructor(mount, { onLoadStart, onLoadEnd } = {}) {
    this._alive      = true;
    this._keys       = new Set();
    this._autoRotate = true;
    this._destroyFx  = null;
    this._lastTime   = performance.now();
    this._rafId      = null;

    this._env    = new HangarRenderer(mount);
    this._cam    = new HangarCameraController(this._env.camera);
    this._loader = new HangarLoader(this._env.scene, { onLoadStart, onLoadEnd });
    this._deploy = new DeploymentAnimator(this._env.scene, this._env.camera, this._cam);

    this._loader.loadStation();
    this._startLoop();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  loadShip(index) {
    if (!this._alive) return;
    this._loader.loadShip(index);
    this._cam.focal.set(0, 0, 0);
  }

  triggerDeployment() {
    const wrapper = this._loader.shipGroup.children[0];
    return this._deploy.triggerDeployment(wrapper);
  }

  detonateCurrentShip() {
    if (this._destroyFx && !this._destroyFx.done) {
      this._destroyFx.cleanup();
    }
    const ship = SHIPS[this._loader.currentShipIndex ?? 0];
    const word = ship?.name ?? 'BABEL';
    const pos  = new THREE.Vector3(0, SHIP_SPAWN_OFFSET.y, 0);
    this._destroyFx = new ShipDestroyFx(this._env.scene, pos, {
      color: 0x00eeff,
      word,
      intensity: 1.2,
    });
    this._destroyFx.spawn();
  }

  setAutoRotate(enabled) {
    this._autoRotate = enabled;
    if (enabled) this._unfreezeModels();
    else         this._freezeModels();
  }

  isAutoRotating() { return this._autoRotate; }

  addKey(key)    { this._keys.add(key); }
  removeKey(key) { this._keys.delete(key); }

  startDrag(x, y) { this._cam.startDrag(x, y); }
  drag(x, y)      { this._cam.drag(x, y); }
  endDrag()       { this._cam.endDrag(); }
  zoom(delta)     { this._cam.zoom(delta); }

  resetOrbit()    { this._cam.resetOrbit(); }
  setTopView()    { this._cam.setTopView(); }
  setBottomView() { this._cam.setBottomView(); }
  setRearView()   { this._cam.setRearView(); }
  setSideView()   { this._cam.setSideView(); }

  toggleDebugMarkers() { this._loader.toggleDebugMarkers(); }

  destroy() {
    this._alive = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._destroyFx?.cleanup();
    this._loader.dispose();
    this._env.destroy();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _freezeModels() {
    this._loader.freezeMixers();
    [this._loader.shipGroup, this._loader.stationGroup].forEach(group => {
      group.traverse(obj => {
        if (obj.isMesh || obj.isGroup) obj.matrixAutoUpdate = false;
      });
    });
  }

  _unfreezeModels() {
    this._loader.unfreezeMixers();
    [this._loader.shipGroup, this._loader.stationGroup].forEach(group => {
      group.traverse(obj => {
        if (obj.isMesh || obj.isGroup) obj.matrixAutoUpdate = true;
      });
    });
    this._loader.shipGroup.children.forEach(ch => this._loader.restoreModelOriginals(ch));
  }

  _startLoop() {
    const animate = () => {
      this._rafId = requestAnimationFrame(animate);
      if (!this._alive) return;

      const now = performance.now();
      const dt  = Math.min((now - this._lastTime) / 1000, 0.05);
      this._lastTime = now;

      this._cam.updateFromKeys(this._keys, this._deploy.isActive);

      if (this._deploy.isActive) {
        this._deploy.update(dt);
      }

      this._cam.applyPosition(this._deploy.shakeAmp, this._deploy.shakeElapsed);

      const isDeploying = this._deploy.isActive;
      this._loader.boosters.forEach(b => b.update(dt, isDeploying, 0.8, 0.8, false));
      this._loader.mixers.forEach(m => m?.update(dt));

      if (this._destroyFx && !this._destroyFx.done) {
        this._destroyFx.update(dt);
      }

      this._env.render();
    };
    animate();
  }
}
