import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { COLORS, SHIPS, SHIP_PALETTES } from '../../shared/constants.js';
import { Bridge } from '../../shared/bridge.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';
import { SHIP_MUZZLE_CONFIGS } from '../rendering/booster/MuzzleConfig.js';
import { tuneLoadedMesh, afterLoadedModel } from '../rendering/modelTuning/combatShipModelTuning.js';
import { getThermalColor } from '../rendering/colors/thermalRamp.js';

const TARGET_MODEL_LENGTH = 3.8;

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
    this._muzzles   = [];
    this._recoil    = 0;
    this._hitShake  = 0;
    this._targetPos = null;
    this._basePosition = new THREE.Vector3(0, 0.2, 2.85);

    this._isThrusting = false;
    this._prevFlowActive = false;

    this._buildFallbackShip();
    this._loadModel();

    this._group.position.copy(this._basePosition);
  }

  get position() { return this._group.position; }

  _buildFallbackShip() {
    this._clearAnimations();
    this._clearShipRoot();

    const cyan = COLORS.PLAYER;

    const bodyGeo = new THREE.ConeGeometry(0.42, 1.8, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: cyan, emissive: cyan, emissiveIntensity: 0.5,
      metalness: 1, roughness: 0.3,
    });
    this._shipRoot.add(new THREE.Mesh(bodyGeo, bodyMat));

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.4, 1.3, -0.1, 0.9, 0.25, -0.05, -0.6,
      0, 0, 0.4, -1.3, -0.1, 0.9, -0.25, -0.05, -0.6,
    ]), 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: cyan, emissive: cyan, emissiveIntensity: 0.10,
      side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5,
    });
    this._shipRoot.add(new THREE.Mesh(wingGeo, wingMat));
  }

  _tuneLoadedMesh(node) { tuneLoadedMesh(node); }

  _afterLoadedModel(modelRoot) {
    afterLoadedModel(modelRoot);

    const combatScale = modelRoot.scale.x;
    const combatRotY  = modelRoot.rotation.y;

    modelRoot.rotation.y = 0;
    modelRoot.scale.setScalar(1);
    const rawBox      = new THREE.Box3().setFromObject(modelRoot);
    const rawHalfSize = rawBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    modelRoot.rotation.y = combatRotY;
    modelRoot.scale.setScalar(combatScale);

    this._boosters.forEach(b => b.dispose());
    this._boosters = [];

    const prefix   = `hangar_${this._ship.id}_`;
    const combatSF = TARGET_MODEL_LENGTH / 2.2;

    Object.entries(SHIP_BOOSTER_CONFIGS)
      .filter(([key]) => key.startsWith(prefix))
      .forEach(([, config]) => {
        const rawPos = new THREE.Vector3(
          config.localPosition.x * rawHalfSize.x,
          config.localPosition.y * rawHalfSize.y,
          config.localPosition.z * rawHalfSize.z,
        );
        rawPos.applyEuler(new THREE.Euler(0, combatRotY, 0));
        rawPos.multiplyScalar(combatScale);

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
          normalRamp:  config.normalRamp,
          flowRamp:    config.flowRamp,
        };

        const booster = new BoosterEffect(combatConfig);
        booster.attachToShip(this._group);
        this._boosters.push(booster);
      });

    if (this._boosters.length === 0) {
      console.warn(`[CombatPlayerShip] No hangar booster config found for ship "${this._ship.id}". Add hangar_${this._ship.id}_0 to SHIP_BOOSTER_CONFIGS.`);
    }

    // ── Muzzles (cañones) — replicar layout del hangar en combate ─────────
    this._muzzles.forEach(m => this._group.remove(m.anchor));
    this._muzzles = [];

    Object.entries(SHIP_MUZZLE_CONFIGS)
      .filter(([key]) => key.startsWith(prefix))
      .forEach(([, config]) => {
        const rawPos = new THREE.Vector3(
          config.localPosition.x * rawHalfSize.x,
          config.localPosition.y * rawHalfSize.y,
          config.localPosition.z * rawHalfSize.z,
        );
        rawPos.applyEuler(new THREE.Euler(0, combatRotY, 0));
        rawPos.multiplyScalar(combatScale);

        const anchor = new THREE.Object3D();
        anchor.position.copy(rawPos);
        this._group.add(anchor);

        const forwardLocal = config.forwardLocal.clone().normalize();
        forwardLocal.applyEuler(new THREE.Euler(0, combatRotY, 0));

        this._muzzles.push({
          anchor,
          forwardLocal,
          color:    config.color,
          emissive: config.emissive,
          scale:    config.scale ?? 1.0,
        });
      });
  }

  setTarget(pos) { this._targetPos = pos; }
  clearTarget()  { this._targetPos = null; }

  // Replica de HangarLoader.getMuzzleShots: devuelve un shot por cañón con
  // origen, anchor vivo, dirección en mundo, color y scale de la paleta.
  getMuzzleShots() {
    if (!this._muzzles.length) return [];
    const out = [];
    const tmpQuat = new THREE.Quaternion();
    const tmpScl  = new THREE.Vector3();
    const tmpPosD = new THREE.Vector3();
    for (const m of this._muzzles) {
      this._group.updateWorldMatrix(true, false);
      const origin = new THREE.Vector3();
      m.anchor.getWorldPosition(origin);
      this._group.matrixWorld.decompose(tmpPosD, tmpQuat, tmpScl);
      const dir = m.forwardLocal.clone().applyQuaternion(tmpQuat).normalize();
      out.push({
        origin,
        anchor:   m.anchor,   // referencia viva para origen dinámico (laser).
        dir,
        color:    m.color,
        emissive: m.emissive,
        scale:    m.scale,
      });
    }
    return out;
  }

  // Ship-specific laser color from SHIP_PALETTES. Falls back to thermalColor if no palette.
  get laserColor() {
    const palette = SHIP_PALETTES[this._ship?.id];
    if (!palette) return this.thermalColor;
    return '#' + new THREE.Color(palette.laserColor).getHexString();
  }

  // Flow-reactive color used for visual feedback (shifts to purple during flow buildup).
  get thermalColor() {
    const { flow, flowActive } = Bridge.peekState();
    return getThermalColor(flow, flowActive);
  }

  fireAnim() {
    this._recoil = 1;
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
    const vScale    = flowActive ? 1.4  : 1.0;
    const rScale    = flowActive ? 1.18 : 1.0;
    const flowRatio = flowActive ? 1.0 : flow / 100;

    if (flowActive !== this._prevFlowActive) {
      this._prevFlowActive = flowActive;
      this._applyFlowOpacity(flowActive);
    }

    this._boosters.forEach(b => {
      b.update(delta, this._isThrusting, vScale, rScale, flowRatio);
    });

    if (this._isThrusting) this._isThrusting = false;
  }

  // Force all ship model mesh materials to opacity=1.0 when entering Flow state.
  // Restores original opacity values on exit.
  _applyFlowOpacity(active) {
    this._shipRoot.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (!m || !m.transparent) return;
        if (active) {
          m._preFlowOpacity = m.opacity;
          m.opacity = 1.0;
        } else if (m._preFlowOpacity !== undefined) {
          m.opacity = m._preFlowOpacity;
          delete m._preFlowOpacity;
        }
      });
    });
  }

  setThrusting(on) { this._isThrusting = on; }

  onLetterCorrect(intensity = 1.0) {
    this._boosters.forEach(b => b.triggerLetterHit(intensity));
    this._isThrusting = true;
  }

  dispose() {
    this._boosters.forEach(b => b.dispose());
    this._boosters = [];
    this._muzzles.forEach(m => this._group.remove(m.anchor));
    this._muzzles = [];
    super.dispose();
  }
}
