import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BLOOM_LAYER, COLORS_FLOW } from '../../shared/constants.js';

const BEAM_LIFE = 0.10;
const BEAM_GLOW_RADIUS = 0.12;

export class LexBeam extends Entity {
  constructor(origin, target, onHit) {
    super();
    this._origin = origin.clone();
    this._target = target;
    this._age    = 0;

    const points = [this._origin.clone(), target.position.clone()];
    this._geo = new THREE.BufferGeometry().setFromPoints(points);
    this._mat = new THREE.LineBasicMaterial({
      color: COLORS_FLOW.BEAM, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this._line = new THREE.Line(this._geo, this._mat);
    this._line.layers.enable(BLOOM_LAYER);

    this._glowGeo = new THREE.CylinderGeometry(BEAM_GLOW_RADIUS, BEAM_GLOW_RADIUS, 1, 10, 1, true);
    this._glowMat = new THREE.MeshBasicMaterial({
      color: COLORS_FLOW.BEAM,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this._glow = new THREE.Mesh(this._glowGeo, this._glowMat);
    this._glow.layers.enable(BLOOM_LAYER);

    this.mesh = new THREE.Group();
    this.mesh.add(this._glow);
    this.mesh.add(this._line);
    this.mesh.layers.enable(BLOOM_LAYER);

    this._tmpDir = new THREE.Vector3();
    this._tmpMid = new THREE.Vector3();
    this._tmpUp = new THREE.Vector3(0, 1, 0);
    this._syncGlow(target.position);

    onHit();
  }

  addToScene(scene)      { scene.add(this.mesh); }
  removeFromScene(scene) {
    scene.remove(this.mesh);
    this._geo.dispose();
    this._mat.dispose();
    this._glowGeo.dispose();
    this._glowMat.dispose();
  }

  update(delta) {
    if (!this.active) return;
    this._age += delta;
    if (this._age >= BEAM_LIFE || !this._target.active) { this.active = false; return; }

    const tp  = this._target.position;
    const pos = this._geo.attributes.position.array;
    pos[3] = tp.x; pos[4] = tp.y; pos[5] = tp.z;
    this._geo.attributes.position.needsUpdate = true;
    this._mat.opacity = 0.9 * (1 - this._age / BEAM_LIFE);
    this._glowMat.opacity = 0.48 * (1 - this._age / BEAM_LIFE);
    this._syncGlow(tp);
  }

  _syncGlow(targetPos) {
    this._tmpDir.subVectors(targetPos, this._origin);
    const len = Math.max(0.001, this._tmpDir.length());
    this._tmpDir.multiplyScalar(1 / len);
    this._tmpMid.addVectors(this._origin, targetPos).multiplyScalar(0.5);

    this._glow.position.copy(this._tmpMid);
    this._glow.quaternion.setFromUnitVectors(this._tmpUp, this._tmpDir);
    this._glow.scale.set(1, len, 1);
  }
}