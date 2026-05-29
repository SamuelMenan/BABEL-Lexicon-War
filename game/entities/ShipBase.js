import * as THREE from 'three';
import { createGLTFLoader } from '../core/gltfLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AssetLoader } from '../core/AssetLoader.js';
import { Entity } from './Entity.js';

const COLLAPSE_SHAKE_DURATION = 0.85; // seconds of trembling
const COLLAPSE_FADE_DURATION  = 0.18; // fast scale-out after shake

export class ShipBase extends Entity {
  constructor({ modelUrl, targetLength, yaw = 0 } = {}) {
    super();
    this._modelUrl = modelUrl;
    this._targetLength = targetLength;
    this._yaw = yaw;
    this._loader = createGLTFLoader();
    this._mixer = null;
    this._actions = [];
    this._t = 0;

    this._collapseActive   = false;
    this._collapseT        = 0;
    this._collapsePhase    = 'idle'; // 'shake' | 'fade' | 'idle'
    this._collapseOnDone   = null;

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
    if (!gltf?.scene) return;

    // Clone the cached scene per use. AssetLoader caches a single gltf across
    // hangar/combat/race; combat tuning sets `node.visible=false` on suspected
    // helper meshes, race shifts root position. Sharing those mutations broke
    // cb1 in hangar (missing parts → bbox drift → looked mispositioned).
    // SkeletonUtils handles skinned meshes correctly (cb1 has a skin).
    const modelScene = SkeletonUtils.clone(gltf.scene);

    const modelRoot = new THREE.Group();
    modelRoot.add(modelScene);

    modelRoot.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = false;
      this._configureLoadedMesh(node);
      this._tuneLoadedMesh(node);
    });

    const initialBox = new THREE.Box3().setFromObject(modelRoot);
    if (!initialBox.isEmpty()) {
      const center = initialBox.getCenter(new THREE.Vector3());
      modelScene.position.sub(center);
    }

    modelRoot.rotation.y = this._yaw;

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
    const geo = AssetLoader.getGeo('sphere-8') ?? new THREE.SphereGeometry(1, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, glowMat);
    mesh.scale.setScalar(radius);
    return mesh;
  }

  // Phase 1 — ship trembles violently for COLLAPSE_SHAKE_DURATION seconds.
  // Phase 2 — rapid scale-to-zero (visually covered by the particle flash).
  // onDone fires at the boundary between phase 1 and 2, so particles start
  // exactly when the ship begins to vanish.
  startCollapse(_scene, onDone) {
    this._collapseActive = true;
    this._collapseT      = 0;
    this._collapsePhase  = 'shake';
    this._collapseOnDone = onDone ?? null;
  }

  dispose() {
    this._clearAnimations();
  }

  update(delta) {
    this._t += delta;
    // Subclasses can pause baked-clip playback during their entry animation
    // (cb1 has a skeletal clip that fights the group-level position lerp).
    if (!this._suspendAnimations) this._mixer?.update(delta);

    if (!this._collapseActive) return;
    this._collapseT += delta;

    if (this._collapsePhase === 'shake') {
      const t   = Math.min(this._collapseT / COLLAPSE_SHAKE_DURATION, 1);
      // Escalating intensity: starts moderate, peaks near end
      const amp = 0.08 + t * 0.18;
      this._shipRoot.position.set(
        Math.sin(this._t * 61) * amp,
        Math.sin(this._t * 47) * amp * 0.7,
        Math.sin(this._t * 53) * amp * 0.4,
      );
      this._shipRoot.rotation.z = Math.sin(this._t * 37) * amp * 0.22;

      if (t >= 1) {
        // Transition to fade — fire onDone so particles+flash trigger now
        this._collapsePhase = 'fade';
        this._collapseT     = 0;
        const cb = this._collapseOnDone;
        this._collapseOnDone = null;
        cb?.();
      }

    } else if (this._collapsePhase === 'fade') {
      const p = Math.min(this._collapseT / COLLAPSE_FADE_DURATION, 1);
      this._group.scale.setScalar(1 - p);
      if (p >= 1) {
        this._collapseActive = false;
        this._collapsePhase  = 'idle';
        this._group.visible  = false;
        this._group.scale.setScalar(1);
        this._shipRoot.position.set(0, 0, 0);
        this._shipRoot.rotation.z = 0;
      }
    }
  }
}
