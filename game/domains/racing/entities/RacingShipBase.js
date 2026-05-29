import * as THREE from 'three';
import { ShipBase } from '@game/entities/ShipBase.js';
import { BLOOM_LAYER, SHIPS } from '@shared/config/constants.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '@game/rendering/booster/BoosterEffect.js';

// Longitud de referencia con la que se calibraron los SHIP_BOOSTER_CONFIGS
// (escala de hangar). racingSF reescala desde aqui al targetLength de cada nave.
const BOOSTER_REF_LENGTH = 2.2;

// Yaw racing: modelRoot apunta a -Z. `ship.rotationY` es la correccion POR NAVE
// — cada modelo trae la punta en un eje distinto, esta formula la alinea.
// NO TOCAR: cambiarla rota mal las naves cuya punta no esta en el eje canonico.
export function racingYaw(ship) {
  return (ship?.rotationY ?? 0) + Math.PI;
}

// Lookup de metadata de nave con fallback opcional (carreras offline → cb1).
export function findRacingShip(id, fallbackId) {
  return SHIPS.find(s => s.id === id)
    ?? (fallbackId ? SHIPS.find(s => s.id === fallbackId) : null)
    ?? SHIPS[0];
}

// Base comun de las naves de carrera (player + opponent): carga de modelo,
// colocacion de boosters orientada al eje de cada nave, animacion de entrada y
// ciclo de vida. La logica de movimiento por-frame (sway/lead) vive en cada
// subclase porque difiere; aqui solo lo identico.
export class RacingShipBase extends ShipBase {
  _buildFxNodes() {
    // Glow sphere removida.
  }

  _configureLoadedMesh(node) {
    node.layers.set(0);
    // Bloom layer en la nave → durante bloom pass se renderiza y escribe depth,
    // ocluyendo el tunel y evitando que su halo se "sume" encima de la nave.
    node.layers.enable(BLOOM_LAYER);
  }

  _tuneLoadedMesh(_node) { /* no overrides — use raw GLTF materials */ }

  // ── Booster setup ─────────────────────────────────────────────────────────
  //
  //   rawPos = fraction × rawHalfSize (raw model space, pre-rotation, pre-scale)
  //   →  applyEuler(modelRotY)  →  ×modelScale  →  group-space position
  //
  // El flame se auto-orienta apuntando lejos del centro via
  // setFromUnitVectors(+Z, rawPos.normalize()). Sensible al eje de cada nave:
  // depende de modelRotY (derivado de racingYaw). Preservar verbatim.
  //
  // ShipBase._applyLoadedModel ya maneja animaciones GLB tipo cb1 (crea _mixer,
  // reproduce clips). No se duplica aqui.
  _placeRacingBoosters(modelRoot, targetLength) {
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

    const racingSF = targetLength / BOOSTER_REF_LENGTH;
    const prefix   = `hangar_${this._ship.id}_`;

    for (const [key, config] of Object.entries(SHIP_BOOSTER_CONFIGS)) {
      if (!key.startsWith(prefix)) continue;
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
    }

    if (this._boosters.length === 0) {
      console.warn(`[${this.constructor.name}] No hangar booster config for "${this._ship.id}". Add ${prefix}0 to SHIP_BOOSTER_CONFIGS.`);
    }

    this._modelLoaded = true;
  }

  // Animacion de entrada (sync salida de hangar): lerp ease-out + slerp a
  // identidad + fade-in de escala. Gateada hasta que el modelo carga. Tuning
  // por-nave via _entryDuration / _entryEasePow / _entrySlerpRate.
  _updateEntry(delta) {
    if (!this._modelLoaded) {
      this._group.position.copy(this._entryStartPos);
      this._group.visible = false;
      return;
    }
    this._group.visible = true;
    // Suspend baked skeletal clip while entry lerp owns the transform —
    // cb1's clip animates root bones and otherwise distorts the entry.
    this._suspendAnimations = true;
    this._entryTime += delta;
    const k  = Math.min(this._entryTime / this._entryDuration, 1);
    // Ease-out (pow configurable: 5 = quintic, 3 = cubic opponent-style para cb1).
    const ek = 1 - Math.pow(1 - k, this._entryEasePow);
    this._group.position.lerpVectors(this._entryStartPos, this._basePosition, ek);
    // Slerp a identidad — rate configurable segun nave.
    this._group.quaternion.slerp(new THREE.Quaternion(), delta * this._entrySlerpRate);
    // Fade-in escala: emerge desde 0 → 1 en primer 35% de la entrada → "salto
    // hiperespacial" en vez de pop visible.
    const fadeK = Math.min(1, k / 0.35);
    const fadeScale = 0.001 + fadeK * 0.999;
    this._group.scale.setScalar(fadeScale);
    this._boosters.forEach(b => b.update(delta, true, 1.4, 1.18, 1.0));
    if (k >= 1) {
      this._entryActive = false;
      this._suspendAnimations = false;
      this._group.scale.setScalar(1);
    }
  }

  setRaceState(state) { this._raceState = state; }

  setBasePosition(position) {
    this._basePosition.copy(position);
    this._group.position.copy(position);
  }

  dispose() {
    this._boosters.forEach(b => b.dispose());
    this._boosters = [];
    super.dispose();
  }
}
