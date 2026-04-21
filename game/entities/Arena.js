import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BLOOM_LAYER } from '../../shared/constants.js';
import { Moon } from './Moon.js';
import { Starfield } from './Starfield.js';

export const ARENA_SCENARIO_1 = 'scenario-1-legacy';
export const ARENA_SCENARIO_2 = 'scenario-2-combat-clean';

export class Arena {
  constructor(scene) {
    this._scene = scene;
    this._decorRings = [];
    this._backdrop = null;
    this._backdropMixer = null;
    this._sf = new Starfield(scene);
    this._moon = new Moon(scene);
  }

  build(scenario) {
    if (scenario === ARENA_SCENARIO_1) {
      this._buildScenario1();
    } else {
      this._buildScenario2();
    }
  }

  update(delta) {
    for (const r of this._decorRings) r.rotation.z += delta * 0.05;
    this._backdropMixer?.update(delta);
    this._moon.update(delta);
  }

  dispose() {
    this._backdropMixer?.stopAllAction();
    this._backdropMixer = null;
    this._backdrop?.removeFromParent();
    this._backdrop = null;
    this._moon.dispose();
  }

  _buildScenario1() {
    this._sf.addBackgroundVoid(0x000000, 280);
    this._loadBackdropScenario1();
    this._sf.addNebula(-60, 20, -120, 0x05070a, 0.06, 70);
    this._sf.addNebula(70, -10, -140, 0x04070b, 0.05, 80);
    this._sf.addNebula(0, 30, -100, 0x08080d, 0.045, 60);
    this._sf.addNebula(-30, -20, -90, 0x090703, 0.04, 50);
    this._sf.addNebula(40, 25, -110, 0x050809, 0.038, 55);
    this._sf.addNebula(-10, 10, -70, 0x0b0507, 0.035, 38);
    this._sf.addNebula(20, -15, -80, 0x040506, 0.04, 45);
    this._sf.addStarField(2000, 500, 0.10, 0xc7d6e6);
    this._sf.addStarField(700, 200, 0.20, 0xd8e2ef);
    this._sf.addStarField(200, 100, 0.35, 0xeaf3ff);
    this._sf.addStarField(40, 80, 0.75, 0xffffff);
    this._decorRings.push(this._sf.addDecorRing(0, 0, -60, 22, 0x0a2030));
    this._decorRings.push(this._sf.addDecorRing(0, 0, -90, 35, 0x0a1525));
  }

  _buildScenario2() {
    this._scene.background = new THREE.Color(0x000000);
    this._scene.fog = null;
    this._sf.addStarField(8000, 900, 0.32, 0x8899bb, 0.72);
    this._sf.addStarField(3500, 650, 0.20, 0xaabbdd, 0.82);
    this._sf.addStarField(1800, 700, 0.28, 0xffeecc, 0.75);
    this._sf.addStarField(500, 300, 0.40, 0xddeeff, 0.95);
    this._sf.addStarField(120, 800, 0.90, 0xffffff, 1.0);
    this._sf.addStarField(30, 600, 1.60, 0xeef6ff, 1.0);
    this._sf.addStarCluster(-180, 80, -200, 90, 22, 0.35, 0xccddff, 0.90);
    this._sf.addStarCluster(220, -60, -350, 70, 18, 0.30, 0xffeedd, 0.85);
    this._sf.addStarCluster(60, 150, -280, 110, 28, 0.25, 0xddeeff, 0.80);
    this._sf.addStarCluster(-100, -120, -180, 50, 15, 0.45, 0xffffff, 1.00);
    this._sf.addStarCluster(-380, 20, -250, 200, 45, 0.28, 0xccddff, 0.85);
    this._sf.addStarCluster(-280, -40, -180, 150, 35, 0.22, 0xddeeff, 0.78);
    this._sf.addStarCluster(-450, 80, -320, 120, 30, 0.32, 0xffffff, 0.70);
    this._sf.addMilkyWay();
    this._moon.load();
    const shipKey = new THREE.PointLight(0xc8deff, 1.6, 9);
    shipKey.position.set(-1.5, 2.5, 5.5);
    this._scene.add(shipKey);
    const shipFill = new THREE.PointLight(0x1a2a55, 1.0, 7);
    shipFill.position.set(2, -1.5, 5);
    this._scene.add(shipFill);
    const shipAmb = new THREE.AmbientLight(0x06090f, 1.0);
    this._scene.add(shipAmb);
  }

  _loadBackdropScenario1() {
    const loader = new GLTFLoader();
    loader.load('/models/radiation_of_space.glb', (gltf) => {
      const sceneRoot = gltf?.scene;
      if (!sceneRoot) return;
      const wrapper = new THREE.Group();
      wrapper.add(sceneRoot);
      sceneRoot.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false; node.receiveShadow = false; node.frustumCulled = false;
        const sourceMats = Array.isArray(node.material) ? node.material : [node.material];
        const tunedMats = sourceMats.map((sourceMat) => {
          if (!sourceMat) return sourceMat;
          const mat = sourceMat.clone();
          const baseColor = mat.color?.clone?.() ?? new THREE.Color(0x9fb7ff);
          mat.fog = false; mat.depthWrite = false; mat.depthTest = true;
          mat.toneMapped = false; mat.side = THREE.DoubleSide;
          if ('color' in mat && mat.color) mat.color.copy(baseColor.lerp(new THREE.Color(0xffffff), 0.2));
          if ('emissive' in mat && mat.emissive) { mat.emissive.copy(baseColor); mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 1.4); }
          if (mat.transparent) mat.opacity = Math.max(mat.opacity ?? 1, 0.9);
          mat.needsUpdate = true;
          return mat;
        });
        node.material = Array.isArray(node.material) ? tunedMats : tunedMats[0];
      });
      const initialBox = new THREE.Box3().setFromObject(wrapper);
      if (!initialBox.isEmpty()) {
        const center = initialBox.getCenter(new THREE.Vector3());
        sceneRoot.position.sub(center);
        const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
        wrapper.scale.setScalar(320 / (Math.max(size.x, size.y, size.z) || 1));
        wrapper.position.z += -95 - new THREE.Box3().setFromObject(wrapper).max.z;
      }
      wrapper.position.x = 0; wrapper.position.y = -6;
      wrapper.rotation.y = Math.PI; wrapper.renderOrder = -1000;
      this._scene.add(wrapper);
      this._backdrop = wrapper;
    }, undefined, (err) => console.warn('Combat backdrop model could not be loaded.', err));
  }

  _loadBackdropScenario2() {
    const loader = new GLTFLoader();
    loader.load('/models/radiation_of_space.glb', (gltf) => {
      const sceneRoot = gltf?.scene;
      if (!sceneRoot) return;
      this._backdropMixer?.stopAllAction();
      this._backdropMixer = null;
      const wrapper = new THREE.Group();
      wrapper.add(sceneRoot);
      sceneRoot.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false; node.receiveShadow = false; node.frustumCulled = false;
        node.layers.enable(BLOOM_LAYER);
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((mat) => {
          if (!mat) return;
          mat.fog = false; mat.depthWrite = false; mat.side = THREE.DoubleSide; mat.toneMapped = false;
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 1.2);
          if ('emissive' in mat && mat.emissive) mat.emissive.copy(mat.color?.clone?.() ?? new THREE.Color(0x8844ff));
          mat.needsUpdate = true;
        });
      });
      const initialBox = new THREE.Box3().setFromObject(wrapper);
      if (!initialBox.isEmpty()) {
        const center = initialBox.getCenter(new THREE.Vector3());
        sceneRoot.position.sub(center);
        const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
        wrapper.scale.setScalar(360 / (Math.max(size.x, size.y, size.z) || 1));
      }
      wrapper.position.set(0, 0, -50); wrapper.rotation.set(0, 0, 0); wrapper.renderOrder = -1000;
      this._scene.add(wrapper);
      this._backdrop = wrapper;
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        this._backdropMixer = new THREE.AnimationMixer(wrapper);
        for (const clip of clips) { const action = this._backdropMixer.clipAction(clip); action.reset(); action.play(); }
      }
    }, undefined, (err) => console.warn('Combat backdrop model could not be loaded.', err));
  }
}
