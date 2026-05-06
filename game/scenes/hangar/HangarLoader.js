import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SHIPS } from '../../../shared/constants.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../../rendering/BoosterEffect.js';

// Adjusts vertical position of all ships. Negative = lower, positive = higher.
const SHIP_SPAWN_OFFSET = { x: 0, y: -0.1, z: 0 };

function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose());
      }
    });
  }
}

export class HangarLoader {
  constructor(scene, { onLoadStart, onLoadEnd } = {}) {
    this._scene       = scene;
    this._onLoadStart = onLoadStart || (() => {});
    this._onLoadEnd   = onLoadEnd   || (() => {});

    this._loader          = new GLTFLoader();
    this._modelsOriginals = new Map();

    this.shipGroup    = new THREE.Group();
    this.stationGroup = new THREE.Group();
    this._scene.add(this.stationGroup);
    this._scene.add(this.shipGroup);

    this.boosters         = [];
    this.mixers           = [];
    this.currentShipIndex = 0;
  }

  loadStation() {
    this._loader.load(
      '/models/spacestation_7_-_procedural.glb',
      (gltf) => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const size   = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        // Center mesh at local origin so stationGroup rotates around (0,0,0)
        model.position.set(-center.x, -center.y, -center.z);

        const wrapper = new THREE.Group();
        wrapper.add(model);
        const maxDim = Math.max(size.x, size.y, size.z);
        wrapper.scale.setScalar(28 / maxDim);
        wrapper.position.set(0.45, -2.5, 2.5);
        wrapper.rotation.x = -0.1;
        wrapper.rotation.y = 0;
        wrapper.rotation.z = 0;

        this.stationGroup.add(wrapper);
      },
      undefined,
      (err) => console.warn('[HangarLoader] station load failed:', err)
    );
  }

  loadShip(index) {
    this.currentShipIndex = index;
    this._onLoadStart();

    disposeGroup(this.shipGroup);
    this.boosters.forEach(b => b.dispose());
    this.boosters = [];
    this.mixers   = [];

    const ship = SHIPS[index];
    this._loader.load(
      ship.url,
      (gltf) => {
        // 1. Calculate bounding box to center mesh at local origin
        const box    = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3();
        const size   = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        gltf.scene.position.set(-center.x, -center.y, -center.z);

        // 2. Wrapper handles scale + rotation without corrupting the center
        const wrapper = new THREE.Group();
        wrapper.add(gltf.scene);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.2 / maxDim;
        wrapper.scale.setScalar(scale);

        if (typeof ship.rotationY === 'number') {
          wrapper.rotation.set(0, ship.rotationY, 0);
        } else {
          wrapper.rotation.set(0, 0, 0);
        }

        const offset = { ...SHIP_SPAWN_OFFSET };
        if (ship.spawnOffset) {
          offset.x += ship.spawnOffset.x || 0;
          offset.y += ship.spawnOffset.y || 0;
          offset.z += ship.spawnOffset.z || 0;
        }
        wrapper.position.set(offset.x, offset.y, offset.z);

        this.shipGroup.add(wrapper);

        // === DEBUG: axis markers — remove when boosters are calibrated ===
        {
          const r    = Math.max(size.x, size.y, size.z) * 0.035;
          const geo  = new THREE.SphereGeometry(r, 8, 8);
          const halfX = size.x / 2, halfY = size.y / 2, halfZ = size.z / 2;
          [
            { pos: [ halfX,  0,      0     ], color: 0xff0000 }, // +X red
            { pos: [-halfX,  0,      0     ], color: 0x880000 }, // -X dark red
            { pos: [0,       halfY,  0     ], color: 0x00ff00 }, // +Y green
            { pos: [0,      -halfY,  0     ], color: 0x008800 }, // -Y dark green
            { pos: [0,       0,      halfZ ], color: 0x4488ff }, // +Z blue
            { pos: [0,       0,     -halfZ ], color: 0x112255 }, // -Z dark blue
          ].forEach(({ pos, color }) => {
            const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
            m.position.set(...pos);
            m.name    = 'debug_axis';
            m.visible = false;
            wrapper.add(m);
          });
          console.log(`[HANGAR DEBUG] ${ship.id} | bbox: x=${size.x.toFixed(2)} y=${size.y.toFixed(2)} z=${size.z.toFixed(2)} | scale=${scale.toFixed(3)} | rotationY=${ship.rotationY}`);
        }
        // === END DEBUG ===

        if (ship.id === 'cb1' || ship.id === 'colaid1') {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.animations.forEach(clip => mixer.clipAction(clip).play());
          this.mixers.push(mixer);
        }

        const prefix   = `hangar_${ship.id}_`;
        const halfSize = size.clone().multiplyScalar(0.5);
        // invScale compensates wrapper.scale so visual sizes appear in scene units,
        // same convention as combat configs (bodyRadius, flameSize, etc. in scene units).
        const invScale = 1 / scale;
        Object.entries(SHIP_BOOSTER_CONFIGS)
          .filter(([key]) => key.startsWith(prefix))
          .forEach(([, config]) => {
            // localPosition: fraction of model half-size (±1 = bounding box edge)
            const scaledPos = new THREE.Vector3(
              config.localPosition.x * halfSize.x,
              config.localPosition.y * halfSize.y,
              config.localPosition.z * halfSize.z,
            );
            const hangarConfig = {
              ...config,
              localPosition: scaledPos,
              bodyRadius:  config.bodyRadius  * invScale,
              bodyLength:  config.bodyLength  * invScale,
              ringRadius:  (config.ringRadius ?? config.bodyRadius * 1.8) * invScale,
              flameSize:   config.flameSize   * invScale,
              innerSize:   config.innerSize   * invScale,
              starSize:    config.starSize    * invScale,
              lightDist:   config.lightDist   * invScale,
              lightOffset: config.lightOffset.clone().multiplyScalar(invScale),
            };
            const booster = new BoosterEffect(hangarConfig);
            booster.attachToShip(wrapper);
            if (config.rootRotY !== undefined) booster._root.rotation.y = config.rootRotY;
            else if (config.flipZ)             booster._root.rotation.y = Math.PI;
            booster.setHangarMode(true);
            this.boosters.push(booster);
          });

        this._saveModelOriginals(wrapper);
        this._onLoadEnd();
      },
      undefined,
      (err) => {
        console.warn('[HangarLoader] ship load failed:', ship.url, err);
        this._onLoadEnd();
      }
    );
  }

  _saveModelOriginals(model) {
    const originals = [];
    model.traverse((obj) => {
      if (obj.isMesh || obj.isGroup) {
        originals.push({
          uuid:     obj.uuid,
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),
          scale:    obj.scale.clone(),
        });
      }
    });
    this._modelsOriginals.set(model.uuid, originals);
  }

  restoreModelOriginals(model) {
    const originals = this._modelsOriginals.get(model.uuid);
    if (!originals) return;
    model.traverse((obj) => {
      const o = originals.find(x => x.uuid === obj.uuid);
      if (o) {
        obj.position.copy(o.position);
        obj.rotation.copy(o.rotation);
        obj.scale.copy(o.scale);
      }
    });
  }

  toggleDebugMarkers() {
    this.shipGroup.traverse(obj => {
      if (obj.name === 'debug_axis') obj.visible = !obj.visible;
    });
  }

  freezeMixers()   { this.mixers.forEach(m => { if (m) m.timeScale = 0; }); }
  unfreezeMixers() { this.mixers.forEach(m => { if (m) m.timeScale = 1; }); }

  dispose() {
    this.boosters.forEach(b => b.dispose());
    this.boosters = [];
    disposeGroup(this.shipGroup);
    disposeGroup(this.stationGroup);
  }
}
