import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AssetLoader } from '../core/AssetLoader.js';
import { Entity } from './Entity.js';

export class ShipBase extends Entity {
  constructor({ modelUrl, targetLength, yaw = 0 } = {}) {
    super();
    this._modelUrl = modelUrl;
    this._targetLength = targetLength;
    this._yaw = yaw;
    this._loader = new GLTFLoader();
    this._mixer = null;
    this._actions = [];
    this._t = 0;

    this._group = new THREE.Group();
    this._shipRoot = new THREE.Group();
    this._group.add(this._shipRoot);
    this.mesh = this._group;
  }

  _clearShipRoot() {
    while (this._shipRoot.children.length > 0) {
      this._shipRoot.remove(this._shipRoot.children[0]);
    }
  }

  _clearAnimations() {
    if (!this._mixer) return;
    this._mixer.stopAllAction();
    this._actions = [];
    this._mixer = null;
  }

  _loadModel() {
    if (!this._modelUrl) return;
    const cached = AssetLoader.getGLTF(this._modelUrl);
    if (cached) { this._applyLoadedModel(cached); return; }
    this._loader.load(
      this._modelUrl,
      (gltf) => { AssetLoader.setGLTF(this._modelUrl, gltf); this._applyLoadedModel(gltf); },
      undefined,
      (err) => { console.warn('Ship model load failed, using fallback ship.', err); },
    );
  }

  _applyLoadedModel(gltf) {
    const modelScene = gltf?.scene;
    if (!modelScene) return;

    const modelRoot = new THREE.Group();
    modelRoot.add(modelScene);
    modelRoot.rotation.y = this._yaw;

    modelRoot.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = false;
      this._configureLoadedMesh(node);
      this._tuneLoadedMesh(node);
    });

    const initialBox = new THREE.Box3().setFromObject(modelRoot);
    if (initialBox.isEmpty()) return;

    const center = initialBox.getCenter(new THREE.Vector3());
    modelScene.position.sub(center);

    const centeredBox = new THREE.Box3().setFromObject(modelRoot);
    const size = centeredBox.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    modelRoot.scale.setScalar(this._targetLength / longest);

    this._clearAnimations();
    this._clearShipRoot();
    this._shipRoot.add(modelRoot);

    const clips = gltf.animations || [];
    if (clips.length > 0) {
      this._mixer = new THREE.AnimationMixer(modelRoot);
      this._actions = clips.map((clip) => {
        const action = this._mixer.clipAction(clip);
        action.reset();
        action.setEffectiveWeight(1);
        action.play();
        return action;
      });
    }

    this._afterLoadedModel(modelRoot, gltf);
  }

  _afterLoadedModel(_modelRoot, _gltf) {}

  _configureLoadedMesh(node) {
    node.layers.set(0);
  }

  _tuneLoadedMesh(_node) {}

  _makePointLight(color, intensity, distance, position) {
    const light = new THREE.PointLight(color, intensity, distance);
    if (position) light.position.copy(position);
    return light;
  }

  _makeGlow(color, opacity, radius) {
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), glowMat);
  }

  dispose() {
    this._clearAnimations();
  }

  update(delta) {
    this._t += delta;
    this._mixer?.update(delta);
  }
}
