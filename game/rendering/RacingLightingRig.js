import * as THREE from 'three';

export class RacingLightingRig {
  constructor(scene) {
    this._scene = scene;
    this._lights = [];
  }

  init() {
    // Identical to ShipSelectionScene lighting — ensures ships render true to Blender.
    const ambient = new THREE.AmbientLight(0x060c1a, 1.0);
    this._add(ambient);

    const starLight = new THREE.DirectionalLight(0xc8d8ff, 3.5);
    starLight.position.set(-10, 8, 12);
    this._add(starLight);

    const rimLight = new THREE.DirectionalLight(0x00ccee, 2.2);
    rimLight.position.set(0, 4, -12);
    this._add(rimLight);

    const warmFill = new THREE.DirectionalLight(0x3a2810, 1.2);
    warmFill.position.set(8, -3, 6);
    this._add(warmFill);
  }

  dispose() {
    this._lights.forEach((l) => this._scene.remove(l));
    this._lights = [];
  }

  _add(light) {
    this._scene.add(light);
    this._lights.push(light);
  }
}
