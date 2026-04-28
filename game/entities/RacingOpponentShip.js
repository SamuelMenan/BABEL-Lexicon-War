import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { BLOOM_LAYER, COLORS } from '../../shared/constants.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';

const ENEMY_MODEL_URL = '/models/spaceship__low_poly.glb';
const TARGET_MODEL_LENGTH = 3.2;

export class RacingOpponentShip extends ShipBase {
  constructor(basePosition = new THREE.Vector3(5.0, -0.15, 0.8)) {
    super({ modelUrl: ENEMY_MODEL_URL, targetLength: TARGET_MODEL_LENGTH, yaw: 0 });
    this._basePosition = basePosition.clone();
    this._raceState = null;

    this._light = null;
    this._lightFill = null;
    this._lightRim = null;

    this._booster = new BoosterEffect(SHIP_BOOSTER_CONFIGS.racingOpponent);
    this._booster.attachToShip(this._group);

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();
    this._group.position.copy(this._basePosition);
  }

  _buildFxNodes() {
    const glow = this._makeGlow(0xff6633, 0.95, 0.20);
    glow.position.set(0, 0, 1.08);
    glow.layers.enable(BLOOM_LAYER);
    this._group.add(glow);
  }

  _buildFallbackShip() {
    this._clearAnimations();
    this._clearShipRoot();

    const bodyGeo = new THREE.ConeGeometry(0.38, 1.5, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.ENEMY,
      emissive: COLORS.ENEMY,
      emissiveIntensity: 0.35,
      metalness: 0.72,
      roughness: 0.28,
    });
    this._shipRoot.add(new THREE.Mesh(bodyGeo, bodyMat));

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.45, 1.1, -0.08, 0.9, 0.18, -0.04, -0.7,
      0, 0, 0.45, -1.1, -0.08, 0.9, -0.18, -0.04, -0.7,
    ]), 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: COLORS.ENEMY,
      emissive: COLORS.ENEMY,
      emissiveIntensity: 0.12,
      side: THREE.DoubleSide,
      metalness: 0.78,
      roughness: 0.22,
    });
    this._shipRoot.add(new THREE.Mesh(wingGeo, wingMat));
  }

  _configureLoadedMesh(node) {
    node.layers.set(0);
  }

  _tuneLoadedMesh(node) {
    if (!node.material) return;
    const mat = RACING_MATERIALS.OPPONENT;
    const inputs = Array.isArray(node.material) ? node.material : [node.material];
    const tuned = inputs.map((src) => {
      const baseColor = src?.color ? src.color.clone().lerp(new THREE.Color(1, 1, 1), 0.45) : new THREE.Color(COLORS.ENEMY);
      const std = new THREE.MeshStandardMaterial({
        color: baseColor,
        map: src?.map || null,
        emissive: new THREE.Color(mat.emissiveR, mat.emissiveG, mat.emissiveB),
        emissiveIntensity: mat.emissiveIntensity,
        metalness: mat.metalness,
        roughness: mat.roughness,
        flatShading: true,
      });
      src?.dispose?.();
      return std;
    });
    node.material = Array.isArray(node.material) ? tuned : tuned[0];
  }

  _afterLoadedModel(_modelRoot) {}

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

    const { t, smoothLead, smoothProgress } = this._raceState;

    this._group.position.x = this._basePosition.x + Math.sin(t * 1.2 + 0.8) * 0.24 + Math.cos(t * 0.62 + 0.2) * 0.11 - smoothLead * 0.05;
    this._group.position.y = this._basePosition.y + Math.sin(t * 1.6 + 1.1) * 0.2 + Math.cos(t * 1.05 + 0.4) * 0.08;
    this._group.position.z = this._basePosition.z + smoothProgress * 0.35 + smoothLead * 0.65;
    this._group.rotation.x = -0.05 + Math.sin(t * 1.4 + 0.3) * 0.05;
    this._group.rotation.y = Math.sin(t * 0.75 + 0.6) * 0.07;
    this._group.rotation.z = -smoothLead * 0.09 + Math.sin(t * 1.1 + 0.5) * 0.06;

    this._light.intensity = 5.5 + Math.sin(t * 2.4) * 0.08;
    this._lightFill.intensity = 3.2 + Math.sin(t * 1.9) * 0.05;
    this._lightRim.intensity = 2.5 + Math.sin(t * 2.1) * 0.06;

    // Opponent is "always" accelerating from the player's perspective;
    // tie it to smoothLead so it dims when the player is winning.
    this._booster.update(delta, smoothLead > -0.5);
  }

  dispose() {
    this._booster.dispose();
    super.dispose();
  }
}
