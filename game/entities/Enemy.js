// Unidad del Enjambre — porta una palabra-núcleo, avanza hacia el jugador

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { COLORS, ENEMY_BASE_SPEED } from '../../shared/constants.js';

const GEO  = new THREE.OctahedronGeometry(0.6, 0);
const MAT_NORMAL   = new THREE.MeshBasicMaterial({ color: COLORS.ENEMY, wireframe: true });
const MAT_TARGETED = new THREE.MeshBasicMaterial({ color: COLORS.ENEMY_TARGETED, wireframe: true });

export class Enemy extends Entity {
  constructor(word, position, speed = ENEMY_BASE_SPEED) {
    super();
    this.word     = word;
    this.speed    = speed;
    this.targeted = false;

    this.mesh = new THREE.Mesh(GEO, MAT_NORMAL.clone());
    this.mesh.position.copy(position);
  }

  setTargeted(val) {
    this.targeted = val;
    this.mesh.material.color.set(
      val ? COLORS.ENEMY_TARGETED : COLORS.ENEMY
    );
  }

  // Avanza hacia el origen (posición del jugador)
  update(delta) {
    if (!this.active) return;

    const dir = new THREE.Vector3()
      .subVectors(new THREE.Vector3(0, 0, 0), this.mesh.position)
      .normalize();

    this.mesh.position.addScaledVector(dir, this.speed * delta);
    this.mesh.rotation.y += delta * 1.2;
    this.mesh.rotation.x += delta * 0.7;
  }

  // Distancia al origen
  get distanceToPlayer() {
    return this.mesh.position.length();
  }

  // Posición 3D para el WordToken
  get position() {
    return this.mesh.position;
  }
}
