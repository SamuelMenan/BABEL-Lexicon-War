import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { BLOOM_LAYER, COLORS } from '../../shared/constants.js';

const CAREER_MODEL_URL = '/models/spaceship.glb';
const TARGET_MODEL_LENGTH = 5.0;

export class CareerPlayer extends ShipBase {
  constructor(basePosition = new THREE.Vector3(-5.2, -1.35, 2.2)) {
    super({ modelUrl: CAREER_MODEL_URL, targetLength: TARGET_MODEL_LENGTH, yaw: Math.PI });
    this._basePosition = basePosition.clone();
    this._raceState = null;

    this._light = null;
    this._lightRim = null;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();
    this._group.position.copy(this._basePosition);
  }

  _buildFxNodes() {
    this._light = this._makePointLight(0xc8deff, 2.1, 18, new THREE.Vector3(0, 0.35, 1.5));
    this._group.add(this._light);

    this._lightRim = this._makePointLight(0x446688, 0.8, 14, new THREE.Vector3(0, 0.25, -1.1));
    this._group.add(this._lightRim);

    const glow = this._makeGlow(0xffaa33, 0.78, 0.1);
    glow.position.set(0, 0, 1.08);
    glow.layers.enable(BLOOM_LAYER);
    this._group.add(glow);
  }

  _buildFallbackShip() {
    this._clearAnimations();
    this._clearShipRoot();

    const bodyGeo = new THREE.ConeGeometry(0.5, 2.1, 7);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.PLAYER,
      emissive: COLORS.PLAYER,
      emissiveIntensity: 0.28,
      metalness: 0.75,
      roughness: 0.24,
    });
    this._shipRoot.add(new THREE.Mesh(bodyGeo, bodyMat));

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.55, 1.6, -0.1, 1.1, 0.25, -0.05, -0.85,
      0, 0, 0.55, -1.6, -0.1, 1.1, -0.25, -0.05, -0.85,
    ]), 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: COLORS.PLAYER,
      emissive: COLORS.PLAYER,
      emissiveIntensity: 0.12,
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.2,
    });
    this._shipRoot.add(new THREE.Mesh(wingGeo, wingMat));
  }

  _configureLoadedMesh(node) {
    node.layers.enable(BLOOM_LAYER);
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
    modelRoot.traverse((node) => {
      if (node.isMesh) node.layers.enable(BLOOM_LAYER);
    });
  }

  setRaceState(state) {
    this._raceState = state;
  }

  setBasePosition(position) {
    this._basePosition.copy(position);
    this._group.position.copy(position);
  }

  update(delta) {
    super.update(delta);

    if (!this._raceState) return;

    const { t, smoothLead, smoothBurst, smoothProgress, typedAdvance, progressPush } = this._raceState;

    this._group.position.x = this._basePosition.x + Math.sin(t * 1.45) * 0.28 + Math.cos(t * 0.68) * 0.14 + smoothLead * 0.06;
    this._group.position.y = this._basePosition.y + Math.sin(t * 2.1) * 0.24 + Math.cos(t * 1.3) * 0.11 + smoothBurst * 0.12;
    this._group.position.z = this._basePosition.z - smoothLead - typedAdvance - progressPush;
    this._group.rotation.x = -0.08 + Math.sin(t * 1.9) * 0.06 - smoothBurst * 0.04;
    this._group.rotation.y = Math.PI + Math.sin(t * 0.92) * 0.08;
    this._group.rotation.z = smoothLead * 0.09 + Math.sin(t * 1.45) * 0.07;

    this._light.intensity = 2.1 + Math.sin(t * 3.0) * 0.08 + smoothBurst * 0.03;
    this._lightRim.intensity = 0.8 + Math.sin(t * 4.0) * 0.04 + smoothProgress * 0.1;
  }
}