import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { BLOOM_LAYER, COLORS } from '../../shared/constants.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';

const TARGET_MODEL_LENGTH = 3.2;

// cb1 noseAxis='+x': yaw=+π/2 maps +X → group -Z.
// Opponent update uses rotation.y ≈ 0 (small oscillation),
// so group -Z → world -Z = racing forward direction.
const OPPONENT_YAW = Math.PI / 2;

export class RacingOpponentShip extends ShipBase {
  constructor(basePosition = new THREE.Vector3(5.0, -0.15, 0.8), shipModel = 'cb1') {
    super({ modelUrl: `/models/spaceship_-_${shipModel}.glb`, targetLength: TARGET_MODEL_LENGTH, yaw: OPPONENT_YAW });
    this._shipModel    = shipModel; // 'cb1', 'spaceship', 'ig127', etc.
    this._basePosition = basePosition.clone();
    this._raceState    = null;
    this._boosters     = [];

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();
    this._group.position.copy(this._basePosition);
  }

  _buildFxNodes() {
    const glow = this._makeGlow(0xffffff, 0.95, 0.20);
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

  _tuneLoadedMesh(_node) { /* no overrides — use raw GLTF materials */ }

  _afterLoadedModel(modelRoot) {
    const modelScale = modelRoot.scale.x;
    const modelRotY  = modelRoot.rotation.y;

    modelRoot.rotation.y = 0;
    modelRoot.scale.setScalar(1);
    const rawBox      = new THREE.Box3().setFromObject(modelRoot);
    const rawHalfSize = rawBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    modelRoot.rotation.y = modelRotY;
    modelRoot.scale.setScalar(modelScale);

    this._boosters.forEach(b => b.dispose());
    this._boosters = [];

    const racingSF = TARGET_MODEL_LENGTH / 2.2;
    const prefix   = `hangar_${this._shipModel}_`;

    Object.entries(SHIP_BOOSTER_CONFIGS)
      .filter(([key]) => key.startsWith(prefix))
      .forEach(([, config]) => {
        const rawPos = new THREE.Vector3(
          config.localPosition.x * rawHalfSize.x,
          config.localPosition.y * rawHalfSize.y,
          config.localPosition.z * rawHalfSize.z,
        );
        rawPos.applyEuler(new THREE.Euler(0, modelRotY, 0));
        rawPos.multiplyScalar(modelScale);

        const racingConfig = {
          ...config,
          localPosition: rawPos,
          bodyRadius:  config.bodyRadius  * racingSF,
          bodyLength:  config.bodyLength  * racingSF,
          ringRadius:  (config.ringRadius ?? config.bodyRadius * 1.8) * racingSF,
          flameSize:   config.flameSize   * racingSF,
          innerSize:   config.innerSize   * racingSF,
          starSize:    config.starSize    * racingSF,
          lightDist:   config.lightDist   * racingSF,
          normalRamp: config.normalRamp,  // Preserve gradient ramps
          flowRamp:   config.flowRamp,
          lightOffset: config.lightOffset.clone().multiplyScalar(racingSF),
        };

        const booster = new BoosterEffect(racingConfig);
        booster.attachToShip(this._group);

        if (rawPos.lengthSq() > 0) {
          const flameDir = rawPos.clone().normalize();
          booster._root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), flameDir);
        }

        this._boosters.push(booster);
      });
`[RacingOpponentShip] No hangar_${this._shipModel}_* booster configs found.`
    if (this._boosters.length === 0) {
      console.warn('[RacingOpponentShip] No hangar_cb1_* booster configs found.');
    }
  }

  setRaceState(state) { this._raceState = state; }

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

    const isThrusting = smoothLead > -0.5;
    this._boosters.forEach(b => b.update(delta, isThrusting, 1, 1, 1.0));
  }

  dispose() {
    this._boosters.forEach(b => b.dispose());
    this._boosters = [];
    super.dispose();
  }
}
