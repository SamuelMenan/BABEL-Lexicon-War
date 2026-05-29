import * as THREE from 'three';
import { Entity } from './Entity.js';
import { createBolt } from '../rendering/fx/BoltVisual.js';
import { PROJECTILE_DEFAULTS } from '../rendering/muzzle/MuzzleConfig.js';

// Bolt homing — sistema unificado con el hangar. Tamaño/color desde
// muzzleConfig (scaleMul) + palette. Velocidad/vida desde PROJECTILE_DEFAULTS.

const HIT_RADIUS_SQ      = 1.0;
const COMBAT_SCALE_BOOST = 2.2; // matchea escala combate (~1.73× hangar visual).
const ALIGN_AXIS         = new THREE.Vector3(0, 1, 0);

export class Projectile extends Entity {
  constructor(origin, target, onHit, color, scaleMul = 1.0) {
    super();
    this._target = target;
    this._onHit  = onHit;
    this._speed  = PROJECTILE_DEFAULTS.speed;
    this._life   = PROJECTILE_DEFAULTS.ttl;
    this._age    = 0;
    this._dir    = new THREE.Vector3();

    this._visual = createBolt({ color, scale: scaleMul * COMBAT_SCALE_BOOST });
    this.mesh = this._visual.root;
    this.mesh.position.copy(origin);
  }

  update(delta) {
    if (!this.active) return;
    this._age += delta;
    if (this._age > this._life)   { this.active = false; return; }
    if (!this._target.active)     { this.active = false; return; }

    this._dir.subVectors(this._target.position, this.mesh.position);
    const distSq = this._dir.lengthSq();
    if (distSq < HIT_RADIUS_SQ) {
      this._onHit();
      this.active = false;
      return;
    }
    this._dir.multiplyScalar(1 / Math.sqrt(distSq));
    this.mesh.position.addScaledVector(this._dir, this._speed * delta);
    this.mesh.quaternion.setFromUnitVectors(ALIGN_AXIS, this._dir);
  }

  removeFromScene(scene) {
    super.removeFromScene(scene);
    this._visual?.dispose();
    this._visual = null;
  }
}
