// Unidad del Enjambre — icosaedro de bordes brillantes, viene desde la profundidad

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { COLORS, ENEMY_BASE_SPEED } from '../../shared/constants.js';

export class Enemy extends Entity {
  constructor(word, position, speed = ENEMY_BASE_SPEED) {
    super();
    this.word     = word;
    this.speed    = speed;
    this.targeted = false;
    this._t       = Math.random() * Math.PI * 2; // fase aleatoria para pulso

    this._group = new THREE.Group();
    this.mesh   = this._group;

    this._build();
    this._group.position.copy(position);
  }

  _build() {
    const geo   = new THREE.IcosahedronGeometry(0.7, 1);
    const edges = new THREE.EdgesGeometry(geo);

    this._lineMat = new THREE.LineBasicMaterial({
      color:       COLORS.ENEMY,
      transparent: true,
      opacity:     0.85,
    });

    const lines = new THREE.LineSegments(edges, this._lineMat);
    this._group.add(lines);

    // Núcleo interior — esfera sólida pequeña (el "word core")
    const coreMat = new THREE.MeshStandardMaterial({
      color:             COLORS.ENEMY,
      emissive:          COLORS.ENEMY,
      emissiveIntensity: 0.6,
      transparent:       true,
      opacity:           0.4,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), coreMat);
    this._coreMesh = core;
    this._group.add(core);

    geo.dispose();
  }

  setTargeted(val) {
    this.targeted = val;
    const color = val ? COLORS.ENEMY_TARGETED : COLORS.ENEMY;
    this._lineMat.color.set(color);
    this._coreMesh.material.color.set(color);
    this._coreMesh.material.emissive.set(color);
    this._coreMesh.material.emissiveIntensity = val ? 1.2 : 0.6;
  }

  update(delta) {
    if (!this.active) return;

    this._t += delta;

    // Avanza hacia el origen (jugador)
    const dir = new THREE.Vector3()
      .subVectors(new THREE.Vector3(0, 0, 2), this._group.position)
      .normalize();
    this._group.position.addScaledVector(dir, this.speed * delta);

    // Rotación tumbling
    this._group.rotation.x += delta * 0.8;
    this._group.rotation.y += delta * 1.1;

    // Pulso de escala
    const pulse = 1 + Math.sin(this._t * 3) * 0.06;
    this._group.scale.setScalar(pulse);
  }

  get distanceToPlayer() {
    return this._group.position.distanceTo(new THREE.Vector3(0, 0, 2));
  }

  get position() {
    return this._group.position;
  }
}
