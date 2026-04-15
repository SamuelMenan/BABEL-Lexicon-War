// Clase base para todas las entidades del juego

import * as THREE from 'three';

export class Entity {
  constructor() {
    this.id      = crypto.randomUUID();
    this.mesh    = null;   // THREE.Object3D asignado por subclase
    this.active  = true;
  }

  update(_delta) {}

  addToScene(scene) {
    if (this.mesh) scene.add(this.mesh);
  }

  removeFromScene(scene) {
    if (this.mesh) scene.remove(this.mesh);
  }

  destroy(scene) {
    this.active = false;
    this.removeFromScene(scene);
    this.mesh?.geometry?.dispose();
    this.mesh?.material?.dispose();
    this.mesh = null;
  }
}
