import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getShipsForHangar } from '../../../shared/shopCatalog.js';
import { AssetLoader } from '../../core/AssetLoader.js';

const SHIPS = getShipsForHangar();
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../../rendering/BoosterEffect.js';
import { SHIP_MUZZLE_CONFIGS } from '../../rendering/booster/MuzzleConfig.js';

// Adjusts vertical position of all ships. Negative = lower, positive = higher.
const SHIP_SPAWN_OFFSET = { x: 0, y: -0.1, z: 0 };

// Detach only — DO NOT dispose materials/geometries. Hangar shares model
// resources with AssetLoader cache (race/combat reuse the same parsed gltf).
// Disposing here breaks the next reload of the same ship (cb1 in particular)
// and corrupts race/combat instances that hold the cached gltf.
function detachGroup(group) {
  while (group.children.length) {
    group.remove(group.children[0]);
  }
}
// Hard dispose — only on unmount/destroy when scene is going away for good.
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
    this.muzzles          = [];
    this.mixers           = [];
    this.currentShipIndex = 0;
    this._loadGen         = 0;     // increments per loadShip — stale callbacks no-op
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

    detachGroup(this.shipGroup);
    this.boosters.forEach(b => b.dispose());
    this.boosters = [];
    this.muzzles  = [];
    this.mixers   = [];

    const ship = SHIPS[index];
    const gen  = ++this._loadGen;

    const onLoaded = (gltfSrc) => {
      // Stale callback — user already switched to another ship.
      if (gen !== this._loadGen) return;
      // Clone scene so cached gltf can be reused by race/combat without
      // three.js re-parenting it away from us (or vice versa). SkeletonUtils
      // handles skinned meshes correctly (cb1 has a skin).
      const sceneClone = SkeletonUtils.clone(gltfSrc.scene);
      const gltf = { scene: sceneClone, animations: gltfSrc.animations };
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

        // Floating idle: guardar baseline para que updateFloat oscile relativo.
        wrapper.userData.floatBaseY    = wrapper.position.y;
        wrapper.userData.floatBaseRotX = wrapper.rotation.x;
        wrapper.userData.floatBaseRotZ = wrapper.rotation.z;
        wrapper.userData.floatPhase    = Math.random() * Math.PI * 2;

        this.shipGroup.add(wrapper);

        if (ship.id === 'lowpoly') {
          this._sanitizeGlassMaterials(gltf.scene);
        }

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
        for (const [key, config] of Object.entries(SHIP_BOOSTER_CONFIGS)) {
          if (!key.startsWith(prefix)) continue;
          {
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
          }
        }

        for (const [key, config] of Object.entries(SHIP_MUZZLE_CONFIGS)) {
          if (!key.startsWith(prefix)) continue;
          {
            const anchor = new THREE.Object3D();
            anchor.name = 'muzzle_anchor';
            anchor.position.set(
              config.localPosition.x * halfSize.x,
              config.localPosition.y * halfSize.y,
              config.localPosition.z * halfSize.z,
            );
            wrapper.add(anchor);
            this.muzzles.push({
              anchor,
              forwardLocal: config.forwardLocal.clone().normalize(),
              wrapper,
              color:    config.color,
              emissive: config.emissive,
              scale:    config.scale ?? 1.0,
            });
          }
        }

        this._saveModelOriginals(wrapper);
        this._onLoadEnd();
    };

    // Prefer AssetLoader cache — preloaded during race/combat preload. Avoids
    // re-downloading 34MB cb1 every hangar switch. Fall back to GLTFLoader if
    // the ship wasn't in the manifest yet.
    const cached = AssetLoader.getGLTF(ship.url);
    if (cached) {
      onLoaded(cached);
      return;
    }
    this._loader.load(
      ship.url,
      (gltf) => { AssetLoader.setGLTF(ship.url, gltf); onLoaded(gltf); },
      undefined,
      (err) => {
        if (gen !== this._loadGen) return;
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

  getMuzzleShots() {
    const out = [];
    const tmpPos = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScl = new THREE.Vector3();
    for (const m of this.muzzles) {
      m.wrapper.updateWorldMatrix(true, false);
      m.anchor.getWorldPosition(tmpPos);
      m.wrapper.matrixWorld.decompose(new THREE.Vector3(), tmpQuat, tmpScl);
      tmpDir.copy(m.forwardLocal).applyQuaternion(tmpQuat).normalize();
      out.push({
        origin:   tmpPos.clone(),
        dir:      tmpDir.clone(),
        color:    m.color,
        emissive: m.emissive,
        scale:    m.scale ?? 1.0,
      });
    }
    return out;
  }

  _sanitizeGlassMaterials(root) {
    const isGlassName = (n) => {
      n = (n || '').toLowerCase();
      return n.includes('glass')  || n.includes('cristal') ||
             n.includes('cabin')  || n.includes('cockpit') ||
             n.includes('canopy') || n.includes('window')  ||
             n.includes('visor');
    };

    root.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;

      const meshNameMatch = isGlassName(obj.name);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];

      const newMats = mats.map(m => {
        const matMatch = isGlassName(m.name);
        const lowOpacity = m.opacity != null && m.opacity < 1;
        const hasTransmission = (m.transmission ?? 0) > 0;
        const looksGlass = meshNameMatch || matMatch || hasTransmission || lowOpacity;

        if (!looksGlass) return m;

        // Promote to MeshPhysicalMaterial if not already — proper glass needs it.
        let target = m;
        if (!m.isMeshPhysicalMaterial) {
          target = new THREE.MeshPhysicalMaterial({
            color:         m.color ? m.color.clone() : new THREE.Color(0x88aabb),
            map:           m.map         || null,
            normalMap:     m.normalMap   || null,
            roughnessMap:  m.roughnessMap || null,
            metalnessMap:  m.metalnessMap || null,
            emissive:      m.emissive    ? m.emissive.clone() : new THREE.Color(0x000000),
            emissiveMap:   m.emissiveMap || null,
            roughness:     m.roughness != null ? m.roughness : 0.05,
            metalness:     m.metalness != null ? m.metalness : 0.0,
            name:          m.name || 'glass',
          });
          m.dispose?.();
        }

        target.transparent  = true;
        target.depthWrite   = false;
        target.side         = THREE.DoubleSide;
        target.transmission = Math.max(target.transmission ?? 0, 0.92);
        target.thickness    = target.thickness && target.thickness > 0 ? target.thickness : 0.25;
        target.ior          = target.ior || 1.5;
        target.roughness    = Math.min(target.roughness ?? 0.05, 0.1);
        target.opacity      = target.opacity != null && target.opacity > 0.05 ? target.opacity : 0.85;
        target.needsUpdate  = true;
        return target;
      });

      obj.material   = Array.isArray(obj.material) ? newMats : newMats[0];
      obj.renderOrder = Math.max(obj.renderOrder, 1);
    });
  }

  toggleDebugMarkers() {
    this.shipGroup.traverse(obj => {
      if (obj.name === 'debug_axis') obj.visible = !obj.visible;
    });
  }

  // ─── Floating idle ───────────────────────────────────────────────────────
  // Llamar cada frame mientras NO este en deployment. `time` en segundos
  // (acumulado por el caller). Bob vertical + roll/pitch leve relativo al
  // baseline guardado en loadShip. Resetea al baseline si time es null.
  updateFloat(time) {
    const BOB_AMP    = 0.06;
    const BOB_FREQ   = 0.8;
    const ROLL_AMP   = 0.025;
    const ROLL_FREQ  = 0.6;
    const PITCH_AMP  = 0.018;
    const PITCH_FREQ = 0.5;
    this.shipGroup.children.forEach(w => {
      const ud = w.userData;
      if (ud.floatBaseY == null) return;
      if (time == null) {
        w.position.y  = ud.floatBaseY;
        w.rotation.x  = ud.floatBaseRotX;
        w.rotation.z  = ud.floatBaseRotZ;
        return;
      }
      const p = ud.floatPhase;
      w.position.y = ud.floatBaseY    + Math.sin(time * BOB_FREQ   + p)       * BOB_AMP;
      w.rotation.z = ud.floatBaseRotZ + Math.sin(time * ROLL_FREQ  + p)       * ROLL_AMP;
      w.rotation.x = ud.floatBaseRotX + Math.sin(time * PITCH_FREQ + p + 1.3) * PITCH_AMP;
    });
  }

  freezeMixers()   { this.mixers.forEach(m => { if (m) m.timeScale = 0; }); }
  unfreezeMixers() { this.mixers.forEach(m => { if (m) m.timeScale = 1; }); }

  dispose() {
    this.boosters.forEach(b => b.dispose());
    this.boosters = [];
    // Detach only — materials/geometries are shared with AssetLoader cache
    // (race/combat reuse them). Disposing here kills cached resources and
    // makes the next reload render empty (cb1 specifically observed broken
    // after race→hangar round-trip). GC reclaims when refs drop naturally.
    detachGroup(this.shipGroup);
    detachGroup(this.stationGroup);
  }
}
