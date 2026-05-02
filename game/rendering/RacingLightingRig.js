import * as THREE from 'three';

export class RacingLightingRig {
  constructor(scene) {
    this._scene = scene;
    this._lights = [];
  }

  init() {
    // Key: cool blue-white from above-front — matches hangar style
    const key = new THREE.PointLight(0xe6f2ff, 3.2, 18);
    key.position.set(-1.1, 3.1, 6.2);
    this._add(key);

    // Fill: soft blue from opposite side
    const fill = new THREE.PointLight(0xb9d4ff, 2.4, 16);
    fill.position.set(2.5, -0.9, 6.1);
    this._add(fill);

    // Rim: cyan-green accent from below (like hangar shipRim)
    const rim = new THREE.PointLight(0x79ffd6, 1.6, 12);
    rim.position.set(0, -1.5, 5.5);
    this._add(rim);

    // Blue rim left for player silhouette (player at x=-5.2)
    const rimL = new THREE.PointLight(0x2266cc, 2.8, 28);
    rimL.position.set(-10, 2, 4);
    this._add(rimL);

    // Warm red rim right for opponent (opponent at x=+5.0)
    const rimR = new THREE.PointLight(0xaa1122, 1.8, 28);
    rimR.position.set(10, 2, 4);
    this._add(rimR);
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
