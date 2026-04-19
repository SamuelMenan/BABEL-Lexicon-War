// Unidad del Enjambre — icosaedro con anillo orbital y núcleo pulsante

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BLOOM_LAYER, COLORS, ENEMY_BASE_SPEED } from '../../shared/constants.js';

export class Enemy extends Entity {
  constructor(word, position, speed = ENEMY_BASE_SPEED) {
    super();
    this.word     = word;
    this.speed    = speed;
    this.targeted = false;
    this._t       = Math.random() * Math.PI * 2;

    this._group = new THREE.Group();
    this.mesh   = this._group;

    this._build();
    this._group.position.copy(position);
  }

  _build() {
    const color = COLORS.ENEMY;

    // Casco — icosaedro de aristas
    const geo   = new THREE.IcosahedronGeometry(0.7, 1);
    const edges = new THREE.EdgesGeometry(geo);
    this._lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const hullLines = new THREE.LineSegments(edges, this._lineMat);
    hullLines.layers.enable(BLOOM_LAYER);
    this._group.add(hullLines);
    geo.dispose();

    // Núcleo interior brillante
    this._coreMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.5,
    });
    this._core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), this._coreMat);
    this._core.layers.enable(BLOOM_LAYER);
    this._group.add(this._core);

    // Anillo orbital — rota independiente
    this._ring = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(1.0, 0.04, 6, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.5,
    });
    this._ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this._ringMesh.layers.enable(BLOOM_LAYER);
    this._ring.add(this._ringMesh);
    this._ring.rotation.x = Math.PI / 3;
    this._group.add(this._ring);

    // Segundo anillo en eje diferente
    const ring2 = new THREE.Group();
    const ring2Mesh = new THREE.Mesh(ringGeo.clone(), ringMat.clone());
    ring2Mesh.layers.enable(BLOOM_LAYER);
    ring2.add(ring2Mesh);
    ring2.rotation.z = Math.PI / 2.5;
    this._ring2 = ring2;
    this._ring2Mat = ring2Mesh.material;
    this._group.add(ring2);
  }

  setTargeted(val) {
    this.targeted = val;
    const color = val ? COLORS.ENEMY_TARGETED : COLORS.ENEMY;
    this._lineMat.color.set(color);
    this._coreMat.color.set(color);
    this._coreMat.emissive.set(color);
    this._ringMesh.material.color.set(color);
    this._ringMesh.material.emissive.set(color);
    this._ring2Mat.color.set(color);
    this._ring2Mat.emissive.set(color);
    this._coreMat.emissiveIntensity = val ? 1.8 : 0.8;
    this._ringMesh.material.emissiveIntensity = val ? 1.2 : 0.5;
  }

  // Impacto de proyectil — flash breve
  hitFlash() {
    this._coreMat.emissiveIntensity = 4;
    setTimeout(() => {
      this._coreMat.emissiveIntensity = this.targeted ? 1.8 : 0.8;
    }, 100);
  }

  update(delta) {
    if (!this.active) return;
    this._t += delta;

    // Avanza hacia el jugador
    const dir = new THREE.Vector3()
      .subVectors(new THREE.Vector3(0, 0, 2), this._group.position)
      .normalize();
    this._group.position.addScaledVector(dir, this.speed * delta);

    // Rotación tumbling del cuerpo
    this._group.rotation.x += delta * 0.6;
    this._group.rotation.y += delta * 0.9;

    // Anillos rotan independientemente
    this._ring.rotation.y  += delta * 1.4;
    this._ring2.rotation.x += delta * 1.1;

    // Pulso del núcleo
    const pulse = 1 + Math.sin(this._t * 2.5) * 0.12;
    this._core.scale.setScalar(pulse);

    // Escala general cuando está targeted — "tiembla" ligeramente
    if (this.targeted) {
      const tremble = 1 + Math.sin(this._t * 18) * 0.03;
      this._group.scale.setScalar(tremble);
    } else {
      this._group.scale.setScalar(1);
    }
  }

  get distanceToPlayer() {
    return this._group.position.distanceTo(new THREE.Vector3(0, 0, 2));
  }

  get position() { return this._group.position; }
}
