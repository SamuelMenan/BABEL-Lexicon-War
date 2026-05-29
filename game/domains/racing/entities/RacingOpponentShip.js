import * as THREE from 'three';
import { BLOOM_LAYER, COLORS } from '@shared/config/constants.js';
import { RacingShipBase, racingYaw, findRacingShip } from './RacingShipBase.js';

const TARGET_MODEL_LENGTH = 3.2;

export class RacingOpponentShip extends RacingShipBase {
  constructor(basePosition = new THREE.Vector3(5.0, -0.15, 0.8), shipModel = 'cb1') {
    // Lookup ship metadata; default a cb1 si no se encuentra (offline race).
    const ship = findRacingShip(shipModel, 'cb1');
    super({ modelUrl: ship.url, targetLength: TARGET_MODEL_LENGTH, yaw: racingYaw(ship) });
    this._ship         = ship;
    this._shipModel    = ship.id;
    this._basePosition = basePosition.clone();
    this._raceState    = null;
    this._boosters     = [];

    // Entry animation espejo de combate (cubic ease, slerp rapido).
    this._entryActive    = true;
    this._entryTime      = 0;
    this._entryDuration  = 3.5;
    this._entryEasePow   = 3;
    this._entrySlerpRate = 4;
    this._entryStartPos = new THREE.Vector3(
      this._basePosition.x,
      this._basePosition.y,
      this._basePosition.z + 90,
    );
    this._modelLoaded = false;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();
    this._group.position.copy(this._entryStartPos);
    // Oculta hasta que el modelo cargue — evita ver el fallback cone antes de tiempo.
    this._group.visible = false;
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
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.layers.enable(BLOOM_LAYER);
    this._shipRoot.add(bodyMesh);

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
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.layers.enable(BLOOM_LAYER);
    this._shipRoot.add(wingMesh);
  }

  _afterLoadedModel(modelRoot) {
    this._placeRacingBoosters(modelRoot, TARGET_MODEL_LENGTH);
  }

  update(delta) {
    super.update(delta);

    if (this._entryActive) { this._updateEntry(delta); return; }

    if (!this._raceState) return;

    const { t, smoothLead, progressZ, smoothProgress } = this._raceState;
    const zBase = (progressZ ?? this._basePosition.z);
    const shrink = THREE.MathUtils.lerp(1.0, 0.5, smoothProgress ?? 0);
    this._group.scale.setScalar(shrink);

    this._group.position.x = this._basePosition.x + Math.sin(t * 1.2 + 0.8) * 0.24 + Math.cos(t * 0.62 + 0.2) * 0.11 - smoothLead * 0.05;
    this._group.position.y = this._basePosition.y + Math.sin(t * 1.6 + 1.1) * 0.2 + Math.cos(t * 1.05 + 0.4) * 0.08;
    // Si player adelanta (smoothLead > 0), opponent queda mas atras (z mayor = mas cerca camara, menos avanzado).
    this._group.position.z = zBase + smoothLead * 0.65;
    this._group.rotation.x = -0.05 + Math.sin(t * 1.4 + 0.3) * 0.05;
    this._group.rotation.y = Math.sin(t * 0.75 + 0.6) * 0.07;
    this._group.rotation.z = -smoothLead * 0.09 + Math.sin(t * 1.1 + 0.5) * 0.06;

    const isThrusting = smoothLead > -0.5;
    // flowRatio=1.0: rampa ascendente → opacidad plena.
    this._boosters.forEach(b => b.update(delta, isThrusting, 1, 1, 1.0));
  }
}
