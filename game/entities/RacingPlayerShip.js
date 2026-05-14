import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { BLOOM_LAYER, COLORS, SHIPS } from '../../shared/constants.js';
import { Bridge } from '../../shared/bridge.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';

const TARGET_MODEL_LENGTH = 5.0;

// Racing forward = -Z (ship moves by decreasing z each frame).
// The update() forces group.rotation.y = π, which maps group +Z → world -Z.
// So we need the model nose to point group +Z after modelRoot.rotation.y = racingYaw.
//   +X-nose ship: rotY(-π/2) maps +X → +Z  ✓
//   +Z-nose ship: no rotation needed         ✓
function getRacingYaw(ship) {
  switch (ship?.noseAxis) {
    case '+x': return -Math.PI / 2;
    case '-x': return  Math.PI / 2;
    case '-z': return Math.PI;
    default:   return 0;
  }
}

export class RacingPlayerShip extends ShipBase {
  constructor(basePosition = new THREE.Vector3(-5.2, -1.35, 2.2)) {
    const { selectedShip } = Bridge.peekState();
    const ship = SHIPS.find(s => s.id === selectedShip) ?? SHIPS[0];

    super({
      modelUrl:     ship.url,
      targetLength: TARGET_MODEL_LENGTH,
      yaw:          getRacingYaw(ship),
    });

    this._ship        = ship;
    this._boosters    = [];
    this._basePosition = basePosition.clone();
    this._raceState   = null;

    // Entry animation — sync con salida de hangar.
    this._entryActive   = true;
    this._entryTime     = 0;
    this._entryDuration = 1.5;
    this._entryStartPos = new THREE.Vector3(
      this._basePosition.x,
      this._basePosition.y,
      this._basePosition.z + 40,
    );
    this._modelLoaded = false;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();
    this._group.position.copy(this._entryStartPos);
  }

  _buildFxNodes() {
    const glow = this._makeGlow(0xffaa33, 0.78, 0.12);
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
    node.layers.set(0);
  }

  _tuneLoadedMesh(_node) { /* no overrides — use raw GLTF materials */ }

  _afterLoadedModel(modelRoot) {
    // ── Booster setup ─────────────────────────────────────────────────────────
    //
    // Same bounding-box math as CombatPlayerShip, adapted for racing:
    //   rawPos = fraction × rawHalfSize (raw model space, pre-rotation, pre-scale)
    //   →  applyEuler(racingYaw)  →  ×modelScale  →  group-space position
    //
    // The flame is auto-oriented to point away from the ship center via
    // setFromUnitVectors(+Z, rawPos.normalize()). This avoids manually translating
    // rootRotY/flipZ (which were calibrated for hangar wrapper space).
    //
    // ShipBase._applyLoadedModel already handles cb1-style GLB animations
    // (creates this._mixer, plays all clips). No duplication needed here.

    const modelScale = modelRoot.scale.x;
    const modelRotY  = modelRoot.rotation.y;

    // Temporarily reset to read pre-rotation, pre-scale bbox
    modelRoot.rotation.y = 0;
    modelRoot.scale.setScalar(1);
    const rawBox      = new THREE.Box3().setFromObject(modelRoot);
    const rawHalfSize = rawBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    modelRoot.rotation.y = modelRotY;
    modelRoot.scale.setScalar(modelScale);

    this._boosters.forEach(b => b.dispose());
    this._boosters = [];

    const prefix   = `hangar_${this._ship.id}_`;
    const racingSF = TARGET_MODEL_LENGTH / 2.2;

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
          lightOffset: config.lightOffset.clone().multiplyScalar(racingSF),
        };

        const booster = new BoosterEffect(racingConfig);
        booster.attachToShip(this._group);

        // Auto-orient flame to point away from ship center (general, no rootRotY needed)
        if (rawPos.lengthSq() > 0) {
          const flameDir = rawPos.clone().normalize();
          booster._root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), flameDir);
        }

        this._boosters.push(booster);
      });

    if (this._boosters.length === 0) {
      console.warn(`[RacingPlayerShip] No hangar booster config for "${this._ship.id}". Add hangar_${this._ship.id}_0 to SHIP_BOOSTER_CONFIGS.`);
    }

    this._modelLoaded = true;
  }

  setRaceState(state) { this._raceState = state; }

  setBasePosition(position) {
    this._basePosition.copy(position);
    this._group.position.copy(position);
  }

  update(delta) {
    super.update(delta);

    // Entry animation (sync hangar exit). Gate hasta modelo cargado.
    if (this._entryActive) {
      if (!this._modelLoaded) {
        this._group.position.copy(this._entryStartPos);
        return;
      }
      this._entryTime += delta;
      const k  = Math.min(this._entryTime / this._entryDuration, 1);
      const ek = 1 - Math.pow(1 - k, 3);
      this._group.position.lerpVectors(this._entryStartPos, this._basePosition, ek);
      this._group.rotation.y = Math.PI;
      this._boosters.forEach(b => b.update(delta, true, 1, 1, 1.0));
      if (k >= 1) this._entryActive = false;
      return;
    }

    if (!this._raceState) return;

    const { t, smoothLead, smoothBurst, typedAdvance, progressPush } = this._raceState;

    this._group.position.x = this._basePosition.x + Math.sin(t * 1.45) * 0.28 + Math.cos(t * 0.68) * 0.14 + smoothLead * 0.06;
    this._group.position.y = this._basePosition.y + Math.sin(t * 2.1) * 0.24 + Math.cos(t * 1.3) * 0.11 + smoothBurst * 0.12;
    this._group.position.z = this._basePosition.z - smoothLead - typedAdvance - progressPush;
    this._group.rotation.x = -0.08 + Math.sin(t * 1.9) * 0.06 - smoothBurst * 0.04;
    this._group.rotation.y = Math.PI + Math.sin(t * 0.92) * 0.08;
    this._group.rotation.z = smoothLead * 0.09 + Math.sin(t * 1.45) * 0.07;

    const isThrusting = smoothBurst > 0.05;
    // flowRatio=1.0: rampa ascendente → opacidad plena, look saturado.
    this._boosters.forEach(b => b.update(delta, isThrusting, 1, 1, 1.0));
  }

  dispose() {
    this._boosters.forEach(b => b.dispose());
    this._boosters = [];
    super.dispose();
  }
}
