// Disparo de la nave TYPO-1 → enemigo objetivo

import * as THREE from 'three';
import { Entity } from './Entity.js';

const SPEED   = 35;  // unidades / seg
const LIFEMAX = 3;   // seg máximo antes de autodestrucción

export class Projectile extends Entity {
  constructor(origin, target, onHit) {
    super();
    this._target  = target;  // Enemy
    this._onHit   = onHit;
    this._age     = 0;

    // Bola de plasma — pequeña y brillante
    const geo = new THREE.SphereGeometry(0.09, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color:             0x00ffcc,
      emissive:          0x00ffcc,
      emissiveIntensity: 3,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(origin);

    // Estela — línea desde origen fijo que se encoge
    const pts   = [origin.clone(), origin.clone()];
    this._trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
    this._trail    = new THREE.Line(
      this._trailGeo,
      new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 }),
    );
    this._trailOrigin = origin.clone();
  }

  addToScene(scene) {
    scene.add(this.mesh);
    scene.add(this._trail);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
    scene.remove(this._trail);
  }

  update(delta) {
    if (!this.active) return;

    this._age += delta;
    if (this._age > LIFEMAX) { this.active = false; return; }

    if (!this._target.active) { this.active = false; return; }

    const targetPos = this._target.position;
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
    this.mesh.position.addScaledVector(dir, SPEED * delta);

    // Actualizar estela
    const pts = [this._trailOrigin.clone().lerp(this.mesh.position, 0.6), this.mesh.position.clone()];
    this._trailGeo.setFromPoints(pts);

    // Hit check
    if (this.mesh.position.distanceTo(targetPos) < 1.0) {
      this._onHit();
      this.active = false;
    }
  }
}
