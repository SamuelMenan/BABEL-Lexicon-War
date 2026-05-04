import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { COLORS, SHIPS } from '../../shared/constants.js';
import { Bridge } from '../../shared/bridge.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';
import { tuneLoadedMesh, afterLoadedModel } from '../rendering/modelTuning/combatShipModelTuning.js';
import { getThermalColor } from '../rendering/colors/thermalRamp.js';

const TARGET_MODEL_LENGTH = 3.8;

// Combat forward = -Z (nose points away from camera toward enemies).
// The hangar rotationY aligns the ship to face +Z (hangar opening), so adding π
// flips it to face -Z for combat. Works for any ship regardless of noseAxis.
function getCombatYaw(ship) {
  return (ship?.rotationY ?? 0) + Math.PI;
}

export class CombatPlayerShip extends ShipBase {
  constructor() {
    const { selectedShip } = Bridge.peekState();
    const ship = SHIPS.find(s => s.id === selectedShip) ?? SHIPS[0];

    super({
      modelUrl:     ship.url,
      targetLength: TARGET_MODEL_LENGTH,
      yaw:          getCombatYaw(ship),
    });

    this._ship      = ship;
    this._boosters  = [];
    this._recoil    = 0;
    this._hitShake  = 0;
    this._targetPos = null;
    this._basePosition = new THREE.Vector3(0, 0.2, 2.85);

    this._muzzle = null;
    this._flash  = null;

    this._isThrusting = false;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();

    this._group.position.copy(this._basePosition);
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
    // Standard tuning: hide helper artifacts, compute socket positions from final bbox.
    afterLoadedModel(modelRoot, (sockets) => this._setSocketPositions(sockets));

    // ── Booster setup ─────────────────────────────────────────────────────────
    //
    // The hangar booster configs store localPosition as fractions of the raw
    // (pre-rotation, pre-scale) model half-bbox. Sizes are in hangar world units
    // where the ship fits inside a 2.2-unit cube.
    //
    // To place boosters in this._group's coordinate space we:
    //   1. Get the raw half-bbox by temporarily zeroing rotation + scale on modelRoot.
    //   2. Multiply fraction × rawHalfSize → position in raw model space.
    //   3. Apply combat yaw rotation (same rotation modelRoot has) → correct orientation.
    //   4. Multiply by modelRoot scale → convert from raw model units to world units.
    //   5. Scale booster sizes by (targetLength / 2.2) for proportional sizing.
    //
    // Flame direction: the default BoosterEffect root points its flame along +Z.
    // After the position math, +Z in group space = tail direction in combat. ✓
    // rootRotY/flipZ were calibrated for the hangar's wrapper space — do NOT apply here.

    const combatScale = modelRoot.scale.x;
    const combatRotY  = modelRoot.rotation.y;

    // Temporarily reset to read pre-rotation, pre-scale bbox
    modelRoot.rotation.y = 0;
    modelRoot.scale.setScalar(1);
    const rawBox      = new THREE.Box3().setFromObject(modelRoot);
    const rawHalfSize = rawBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    modelRoot.rotation.y = combatRotY;
    modelRoot.scale.setScalar(combatScale);

    // Dispose any boosters from a previous reload
    this._boosters.forEach(b => b.dispose());
    this._boosters = [];

    const prefix   = `hangar_${this._ship.id}_`;
    const combatSF = TARGET_MODEL_LENGTH / 2.2; // size scale factor: hangar → combat

    Object.entries(SHIP_BOOSTER_CONFIGS)
      .filter(([key]) => key.startsWith(prefix))
      .forEach(([, config]) => {
        // Step 1-4: position in group space
        const rawPos = new THREE.Vector3(
          config.localPosition.x * rawHalfSize.x,
          config.localPosition.y * rawHalfSize.y,
          config.localPosition.z * rawHalfSize.z,
        );
        rawPos.applyEuler(new THREE.Euler(0, combatRotY, 0));
        rawPos.multiplyScalar(combatScale);

        // Step 5: scale all dimensional properties
        const combatConfig = {
          ...config,
          localPosition: rawPos,
          bodyRadius:  config.bodyRadius  * combatSF,
          bodyLength:  config.bodyLength  * combatSF,
          ringRadius:  (config.ringRadius ?? config.bodyRadius * 1.8) * combatSF,
          flameSize:   config.flameSize   * combatSF,
          innerSize:   config.innerSize   * combatSF,
          starSize:    config.starSize    * combatSF,
          lightDist:   config.lightDist   * combatSF,
          lightOffset: config.lightOffset.clone().multiplyScalar(combatSF),
          normalRamp: config.normalRamp,  // Preserve gradient ramps for animated colors
          flowRamp:   config.flowRamp,
        };

        const booster = new BoosterEffect(combatConfig);
        booster.attachToShip(this._group);
        this._boosters.push(booster);
      });

    if (this._boosters.length === 0) {
      console.warn(`[CombatPlayerShip] No hangar booster config found for ship "${this._ship.id}". Add hangar_${this._ship.id}_0 to SHIP_BOOSTER_CONFIGS.`);
    }
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
    super.update(delta);

    const floatY   = Math.sin(this._t * 1.2) * 0.12;
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

    const { flow, flowActive } = Bridge.peekState();
    const vScale     = flowActive ? 1.4  : 1.0;
    const rScale     = flowActive ? 1.18 : 1.0;
    const flowRatio  = flowActive ? 1.0 : flow / 100;

    this._boosters.forEach(b => {
      b.update(delta, this._isThrusting, vScale, rScale, flowRatio);
    });

    if (this._isThrusting) this._isThrusting = false;
  }

  get thermalColor() {
    const { flow, flowActive } = Bridge.peekState();
    return getThermalColor(flow, flowActive);
  }

  setThrusting(on) { this._isThrusting = on; }

  onLetterCorrect(intensity = 1.0) {
    this._boosters.forEach(b => b.triggerLetterHit(intensity));
    this._isThrusting = true;
  }

  dispose() {
    clearTimeout(this._fireAnimTimer);
    this._fireAnimTimer = null;
    this._boosters.forEach(b => b.dispose());
    this._boosters = [];
    super.dispose();
  }
}
