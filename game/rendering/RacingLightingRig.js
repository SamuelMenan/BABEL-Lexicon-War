import * as THREE from 'three';

export class RacingLightingRig {
  constructor(scene) {
    this._scene = scene;
    this._lights = [];
  }

  init() {
    // Key: front-center, no falloff — base illumination for both ships
    const key = new THREE.DirectionalLight(0xc8deff, 2.0);
    key.position.set(0, 3, 10);
    this._add(key);

    // Fill: warm amber from below
    const fill = new THREE.DirectionalLight(0xff9944, 0.6);
    fill.position.set(0, -5, 4);
    this._add(fill);

    // Rim left: blue for player silhouette (player at x=-5.2)
    const rimL = new THREE.PointLight(0x2244bb, 2.2, 32);
    rimL.position.set(-12, 3, 3);
    this._add(rimL);

    // Rim right: red for opponent silhouette (opponent at x=+5.0)
    const rimR = new THREE.PointLight(0xaa1122, 2.2, 32);
    rimR.position.set(12, 3, 3);
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
