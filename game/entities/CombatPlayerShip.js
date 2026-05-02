import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { COLORS } from '../../shared/constants.js';
import { Bridge } from '../../shared/bridge.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';
import { createShipCollapseFx } from '../rendering/fx/shipCollapseFx.js';
import { tuneLoadedMesh, afterLoadedModel } from '../rendering/modelTuning/combatShipModelTuning.js';
import { getThermalColor } from '../rendering/colors/thermalRamp.js';

const COMBAT_MODEL_URL    = '/models/spaceshipnew.glb';
const TARGET_MODEL_LENGTH = 3.8;
const COMBAT_MODEL_YAW    = Math.PI + 0.75;

export class CombatPlayerShip extends ShipBase {
  constructor() {
    super({ modelUrl: COMBAT_MODEL_URL, targetLength: TARGET_MODEL_LENGTH, yaw: COMBAT_MODEL_YAW });
    this._recoil    = 0;
    this._hitShake  = 0;
    this._targetPos = null;
    this._basePosition = new THREE.Vector3(0, 0.2, 2.85);

    this._muzzle    = null;
    this._flash     = null;
    this._light     = null;
    this._lightRim  = null;
    this._lightFill = null;
    this._lightBack = null;

    this._booster = new BoosterEffect(SHIP_BOOSTER_CONFIGS.combatPlayer);
    this._booster.attachToShip(this._group);
    this._isThrusting = false;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();

    this._group.position.copy(this._basePosition);
    this._collapsing     = false;
    this._collapseT      = 0;
    this._collapseOnDone = null;
    this._collapseDone   = false;
    this._collapseScene  = null;
    this._collapseFx     = null;
  }

  get position() { return this._group.position; }

  _buildFxNodes() {
    const cyan = COLORS.PLAYER;

    this._muzzle = new THREE.Object3D();
    this._group.add(this._muzzle);

    const flashMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: cyan,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0,
    });
    this._flash = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), flashMat);
    this._group.add(this._flash);

    this._light     = this._makePointLight(0xd8e8ff, 3.8, 13, new THREE.Vector3(-0.2, 1.2, -0.45));
    this._lightRim  = this._makePointLight(0x79ffd6, 2.6, 11, new THREE.Vector3(0.12, -0.3, 1.4));
    this._lightFill = this._makePointLight(0xffffff, 3.0, 11, new THREE.Vector3(0, 0.35, -1.35));
    this._lightBack = this._makePointLight(0xfff1d8, 3.4, 12, new THREE.Vector3(0, 0.35, 1.95));
    this._group.add(this._light, this._lightRim, this._lightFill, this._lightBack);

    this._setSocketPositions({ centerX: 0, centerY: 0, frontZ: -0.95 });
  }

  _setSocketPositions({ centerX, centerY, frontZ }) {
    this._muzzle.position.set(centerX, centerY, frontZ);
    this._flash.position.set(centerX, centerY, frontZ);
  }

  _buildFallbackShip() {
    this._clearAnimations();
    this._clearShipRoot();

    const cyan = COLORS.PLAYER;

    const bodyGeo = new THREE.ConeGeometry(0.42, 1.8, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: cyan, emissive: cyan, emissiveIntensity: 0.35,
      metalness: 0.7, roughness: 0.25,
    });
    this._shipRoot.add(new THREE.Mesh(bodyGeo, bodyMat));

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.4, 1.3, -0.1, 0.9, 0.25, -0.05, -0.6,
      0, 0, 0.4, -1.3, -0.1, 0.9, -0.25, -0.05, -0.6,
    ]), 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: cyan, emissive: cyan, emissiveIntensity: 0.15,
      side: THREE.DoubleSide, metalness: 0.8, roughness: 0.2,
    });
    this._shipRoot.add(new THREE.Mesh(wingGeo, wingMat));

    this._setSocketPositions({ centerX: 0, centerY: 0, frontZ: -0.95 });
  }

  _tuneLoadedMesh(node) { tuneLoadedMesh(node); }

  _afterLoadedModel(modelRoot) {
    afterLoadedModel(modelRoot, (sockets) => this._setSocketPositions(sockets));
  }

  setTarget(pos) { this._targetPos = pos; }
  clearTarget()  { this._targetPos = null; }

  get muzzlePosition() {
    const pos = new THREE.Vector3();
    this._muzzle.getWorldPosition(pos);
    return pos;
  }

  fireAnim() {
    this._recoil = 1;
    this._flash.material.opacity = 0.8;
    clearTimeout(this._fireAnimTimer);
    this._fireAnimTimer = setTimeout(() => {
      this._fireAnimTimer = null;
      if (this._flash?.material) this._flash.material.opacity = 0;
    }, 80);
  }

  takeHit(strength = 1) {
    const s = Math.max(0.2, Number(strength) || 1);
    this._hitShake = Math.max(this._hitShake, Math.min(1.2, 0.55 * s));
    this._recoil   = Math.max(this._recoil,   0.35 * s);
  }

  update(delta) {
    if (this._collapsing) { this._updateCollapse(delta); return; }
    super.update(delta);

    const floatY   = Math.sin(this._t * 1.2) * 0.12;
    // Sinusoidal roll -- wings rise and fall at ~0.85 Hz
    const wingRoll = Math.sin(this._t * 0.85) * 0.045;
    this._shipRoot.rotation.z = wingRoll;
    const shakeY = this._hitShake > 0 ? Math.sin(this._t * 28) * this._hitShake * 0.35 : 0;
    if (this._hitShake > 0) this._hitShake = Math.max(0, this._hitShake - delta * 4);
    this._group.position.y = this._basePosition.y + floatY + shakeY;

    const tx    = this._targetPos ? this._targetPos.x : 0;
    const snapX = tx < -6 ? -4.3 : tx > 6 ? 4.3 : 0;
    this._group.position.x += (snapX - this._group.position.x) * Math.min(delta * 3, 1);

    if (this._targetPos) {
      const dir = new THREE.Vector3().subVectors(this._targetPos, this._group.position).normalize();
      dir.y = -0.05;
      dir.normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
      this._group.quaternion.slerp(targetQuat, delta * 7);
    } else {
      this._group.quaternion.slerp(new THREE.Quaternion(), delta * 2);
    }

    if (this._recoil > 0) {
      this._group.position.z = this._basePosition.z + this._recoil * 0.24;
      this._recoil = Math.max(0, this._recoil - delta * 8);
    } else {
      this._group.position.z = this._basePosition.z + Math.sin(this._t * 0.35) * 0.02;
    }

    this._light.intensity     = 3.8 + Math.sin(this._t * 3)   * 0.18 + this._recoil * 0.6;
    this._lightRim.intensity  = 2.6 + Math.sin(this._t * 4)   * 0.14 + this._recoil * 0.4;
    if (this._lightFill) this._lightFill.intensity = 3.0 + Math.sin(this._t * 2.4) * 0.14 + this._recoil * 0.3;
    if (this._lightBack) this._lightBack.intensity = 3.4 + Math.sin(this._t * 2.2) * 0.16 + this._recoil * 0.4;

    const { flow, flowActive } = Bridge.peekState();
    this._booster.setThermalColor(getThermalColor(flow, flowActive));
    this._booster.update(delta, this._isThrusting, flowActive ? 1.4 : 1.0, flowActive ? 1.18 : 1.0, flowActive);
    if (this._isThrusting) this._isThrusting = false;   // auto-clear; caller sets it each frame
  }

  get thermalColor() {
    const { flow, flowActive } = Bridge.peekState();
    return getThermalColor(flow, flowActive);
  }

  /** Call each frame while the engines are firing (e.g. when targeting, boosting, or recoiling). */
  setThrusting(on) { this._isThrusting = on; }

  /** Booster burst on correct letter typed. */
  onLetterCorrect(intensity = 1.0) {
    this._booster.triggerLetterHit(intensity);
    this._isThrusting = true;
  }

  startCollapse(scene, onDone) {
    if (this._collapsing) return;
    this._collapsing     = true;
    this._collapseT      = 0;
    this._collapseDone   = false;
    this._collapseScene  = scene;
    this._collapseOnDone = onDone ?? null;

    this._group.traverse(node => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(mat => { mat.transparent = true; mat.needsUpdate = true; });
    });

    this._collapseFx = createShipCollapseFx({ scene, origin: this._group.position });
    this._collapseFx.spawn();
  }

  _updateCollapse(delta) {
    if (this._collapseDone) return;
    const TOTAL = 2.8;
    this._collapseT += delta;
    const t = Math.min(this._collapseT / TOTAL, 1);

    this._collapseFx?.update(delta, this._collapseT);

    // Ship hull: small scale pulse then sine wobble (NOT random jitter)
    if (t < 0.12) {
      this._group.scale.setScalar(1 + (t / 0.12) * 0.30);
    } else if (t < 0.26) {
      this._group.scale.setScalar(1.30 - ((t - 0.12) / 0.14) * 0.30);
    }

    if (t >= 0.10) {
      const wAmp = Math.min(0.55, (t - 0.10) / 0.35 * 0.55);
      const f1 = 16 + t * 28;
      const f2 = 21 + t * 34;
      this._group.position.x = this._basePosition.x + Math.sin(this._collapseT * f1) * wAmp * 0.40;
      this._group.position.y = this._basePosition.y + Math.sin(this._collapseT * f2) * wAmp * 0.32;
      this._group.rotation.z = Math.sin(this._collapseT * (f1 * 0.65)) * wAmp * 0.50;
      this._group.rotation.x = Math.sin(this._collapseT * (f2 * 0.55)) * wAmp * 0.22;
    }

    // Ship stays opaque until t=0.55, then fades
    const opacity = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);

    // Softer lexical shimmer to avoid harsh strobe while collapsing
    const shimmer = t > 0.12 && t < 0.92
      ? 1.1 + 0.55 * Math.sin(this._collapseT * 24) + 0.2 * Math.sin(this._collapseT * 9)
      : 0.95;
    const emissiveFactor = Math.max(0.35, shimmer);

    this._group.traverse(node => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(mat => {
        mat.opacity = opacity;
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = emissiveFactor * Math.max(0.15, 1 - t * 0.7);
      });
    });
    if (this._light)     this._light.intensity     = (4.2 + 0.8 * Math.sin(this._collapseT * 18)) * opacity;
    if (this._lightRim)  this._lightRim.intensity  = (2.8 + 0.5 * Math.sin(this._collapseT * 22)) * opacity;
    if (this._lightFill) this._lightFill.intensity = (3.2 + 0.6 * Math.sin(this._collapseT * 14)) * opacity;
    if (this._lightBack) this._lightBack.intensity = (3.6 + 0.7 * Math.sin(this._collapseT * 17)) * opacity;

    if (t >= 1) {
      this._collapseDone = true;
      this._collapseFx?.cleanup();
      this._collapseFx = null;
      const cb = this._collapseOnDone;
      this._collapseOnDone = null;
      cb?.();
    }
  }

  dispose(scene = null) {
    clearTimeout(this._fireAnimTimer);
    this._fireAnimTimer = null;
    if (this._collapseFx) {
      this._collapseFx.cleanup();
      this._collapseFx = null;
    }
    this._collapseScene  = null;
    this._collapseOnDone = null;
    this._booster.dispose();
    super.dispose();
  }
}
