import * as THREE from 'three';
import { BLOOM_LAYER, COLORS, SHIPS } from '@shared/config/constants.js';
import { Bridge } from '@shared/state/bridge.js';
import { RacingShipBase, racingYaw } from './RacingShipBase.js';

const TARGET_MODEL_LENGTH = 5.0;

export class RacingPlayerShip extends RacingShipBase {
  constructor(basePosition = new THREE.Vector3(-5.2, -1.35, 2.2)) {
    const { selectedShip } = Bridge.peekState();
    const ship = SHIPS.find(s => s.id === selectedShip) ?? SHIPS[0];

    super({
      modelUrl:     ship.url,
      targetLength: TARGET_MODEL_LENGTH,
      yaw:          racingYaw(ship),
    });

    this._ship        = ship;
    this._boosters    = [];
    this._basePosition = basePosition.clone();
    this._raceState   = null;

    // Entry animation estandar para TODAS las naves (incluida cb1). Antes habia
    // un branch cb1 que reusaba el patron opponent — se removio porque generaba
    // conflictos visuales: la nave entra con un patron distinto al resto.
    this._entryActive    = true;
    this._entryTime      = 0;
    this._entryDuration  = 5.0;
    this._entrySlerpRate = 1.6;
    this._entryEasePow   = 5;
    this._entryStartPos = new THREE.Vector3(
      this._basePosition.x,
      this._basePosition.y,
      this._basePosition.z - 140,  // spawn DEEP (mas alla del vortice)
    );
    this._modelLoaded = false;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();
    this._group.position.copy(this._entryStartPos);
    this._group.rotation.set(0, Math.PI, 0);
    // Oculta hasta que el modelo cargue → no se ve el fallback ni el modelo a medias.
    this._group.visible = false;
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
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.layers.enable(BLOOM_LAYER);
    this._shipRoot.add(bodyMesh);

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
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.layers.enable(BLOOM_LAYER);
    this._shipRoot.add(wingMesh);
  }

  _afterLoadedModel(modelRoot) {
    this._placeRacingBoosters(modelRoot, TARGET_MODEL_LENGTH);
  }

  update(delta) {
    super.update(delta);

    // Entry animation (sync hangar exit). Gate hasta modelo cargado.
    if (this._entryActive) { this._updateEntry(delta); return; }

    if (!this._raceState) return;

    const { t, smoothLead, smoothBurst, typedAdvance, progressZ, smoothProgress } = this._raceState;
    const zBase = (progressZ ?? this._basePosition.z);
    // Encoge la nave a medida que se aleja → refuerza sensacion de avance.
    const shrink = THREE.MathUtils.lerp(1.0, 0.5, smoothProgress ?? 0);
    this._group.scale.setScalar(shrink);

    this._group.position.x = this._basePosition.x + Math.sin(t * 1.45) * 0.28 + Math.cos(t * 0.68) * 0.14 + smoothLead * 0.06;
    this._group.position.y = this._basePosition.y + Math.sin(t * 2.1) * 0.24 + Math.cos(t * 1.3) * 0.11 + smoothBurst * 0.12;
    this._group.position.z = zBase - smoothLead - typedAdvance;
    // Group en identidad (orientacion viene de modelRoot ya alineado por combat formula).
    this._group.rotation.x = -0.08 + Math.sin(t * 1.9) * 0.06 - smoothBurst * 0.04;
    this._group.rotation.y = Math.sin(t * 0.92) * 0.08;
    this._group.rotation.z = smoothLead * 0.09 + Math.sin(t * 1.45) * 0.07;

    const isThrusting = smoothBurst > 0.05;
    // flowRatio=1.0: rampa ascendente → opacidad plena, look saturado.
    this._boosters.forEach(b => b.update(delta, isThrusting, 1, 1, 1.0));
  }
}
