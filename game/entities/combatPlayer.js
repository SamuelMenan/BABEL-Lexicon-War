import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { COLORS } from '../../shared/constants.js';

const COMBAT_MODEL_URL = '/models/spaceship_colaid1_50k.glb';
const TARGET_MODEL_LENGTH = 3.8;

export class CombatPlayer extends ShipBase {
  constructor() {
    super({ modelUrl: COMBAT_MODEL_URL, targetLength: TARGET_MODEL_LENGTH, yaw: Math.PI });
    this._recoil = 0;
    this._hitShake = 0;
    this._targetPos = null;
    this._basePosition = new THREE.Vector3(0, 0.2, 2.85);

    this._muzzle = null;
    this._flash = null;
    this._light = null;
    this._lightRim = null;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();

    this._group.position.copy(this._basePosition);
  }

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

    this._light = this._makePointLight(0xc0d8ff, 0.5, 5, new THREE.Vector3(-0.4, 0.9, -0.3));
    this._group.add(this._light);

    this._lightRim = this._makePointLight(0x00eebb, 0.25, 4, new THREE.Vector3(0, -0.8, 1.0));
    this._group.add(this._lightRim);

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
      color: cyan,
      emissive: cyan,
      emissiveIntensity: 0.35,
      metalness: 0.7,
      roughness: 0.25,
    });
    this._shipRoot.add(new THREE.Mesh(bodyGeo, bodyMat));

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.4, 1.3, -0.1, 0.9, 0.25, -0.05, -0.6,
      0, 0, 0.4, -1.3, -0.1, 0.9, -0.25, -0.05, -0.6,
    ]), 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: cyan,
      emissive: cyan,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.2,
    });
    this._shipRoot.add(new THREE.Mesh(wingGeo, wingMat));

    this._setSocketPositions({ centerX: 0, centerY: 0, frontZ: -0.95 });
  }

  _tuneLoadedMesh(node) {
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) return;
      if ('emissive' in material && material.emissive) {
        material.emissive = new THREE.Color(0.35, 0.2, 0.05);
        material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.85);
      }
      if ('metalness' in material) material.metalness = Math.min(1, (material.metalness ?? 0.5) + 0.08);
      if ('roughness' in material) material.roughness = Math.max(0.12, (material.roughness ?? 0.7) - 0.15);
      material.needsUpdate = true;
    });
  }

  _afterLoadedModel(modelRoot) {
    const finalBox = new THREE.Box3().setFromObject(modelRoot);
    if (!finalBox.isEmpty()) {
      this._setSocketPositions({
        centerX: 0,
        centerY: 0,
        frontZ: finalBox.min.z - 0.15,
      });
    }
  }

  setTarget(pos) { this._targetPos = pos; }
  clearTarget() { this._targetPos = null; }

  get muzzlePosition() {
    const pos = new THREE.Vector3();
    this._muzzle.getWorldPosition(pos);
    return pos;
  }

  fireAnim() {
    this._recoil = 1;
    this._flash.material.opacity = 0.8;
    setTimeout(() => {
      if (this._flash) this._flash.material.opacity = 0;
    }, 80);
  }

  takeHit(strength = 1) {
    const s = Math.max(0.2, Number(strength) || 1);
    this._hitShake = Math.max(this._hitShake, Math.min(1.2, 0.55 * s));
    this._recoil = Math.max(this._recoil, 0.35 * s);
  }

  update(delta) {
    super.update(delta);

    const floatY = Math.sin(this._t * 1.2) * 0.12;
    const shakeY = this._hitShake > 0 ? Math.sin(this._t * 28) * this._hitShake * 0.35 : 0;
    if (this._hitShake > 0) this._hitShake = Math.max(0, this._hitShake - delta * 4);
    this._group.position.y = this._basePosition.y + floatY + shakeY;

    const tx = this._targetPos ? this._targetPos.x : 0;
    const snapX = tx < -6 ? -4.3 : tx > 6 ? 4.3 : 0;
    this._group.position.x += (snapX - this._group.position.x) * Math.min(delta * 3, 1);

    if (this._targetPos) {
      const dir = new THREE.Vector3().subVectors(this._targetPos, this._group.position).normalize();
      dir.y = -0.25;
      dir.normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        dir,
      );
      this._group.quaternion.slerp(targetQuat, delta * 3);
    } else {
      this._group.quaternion.slerp(new THREE.Quaternion(), delta * 2);
    }

    if (this._recoil > 0) {
      this._group.position.z = this._basePosition.z + this._recoil * 0.24;
      this._recoil = Math.max(0, this._recoil - delta * 8);
    } else {
      this._group.position.z = this._basePosition.z + Math.sin(this._t * 0.35) * 0.02;
    }

    this._light.intensity = 0.5 + Math.sin(this._t * 3) * 0.04 + this._recoil * 0.2;
    this._lightRim.intensity = 0.25 + Math.sin(this._t * 4) * 0.03 + this._recoil * 0.1;
  }
}