import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SHIPS } from '../../shared/constants.js';
import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';

// Puedes ajustar la altura (posición vertical) de TODAS las naves cambiando el valor de "y".
// Valores negativos (ej: -0.5) bajan las naves, valores positivos (ej: 0.5) las suben.
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

export class ShipSelectionScene {
  constructor(mount, { onLoadStart, onLoadEnd } = {}) {
    this._mount = mount;
    this._onLoadStart = onLoadStart || (() => { });
    this._onLoadEnd = onLoadEnd || (() => { });
    this._alive = true;
    this._orbit = {
      theta: 0.4, phi: 0.28, radius: 4.5,
      isDragging: false, lastX: 0, lastY: 0,
      phiMin: -1.56, phiMax: 1.56, radiusMin: 1.8, radiusMax: 10,
    };
    this._autoRotate = true;
    this._stationRotating = true;
    this._keys = new Set();
    this._modelsOriginals = new Map();
    this._mixers = [];
    this._boosters = [];
    this._focal = new THREE.Vector3(0, 0, 0);
    this._rafId = null;
    this._shipGroup = null;
    this._stationGroup = null;
    this._loader = new GLTFLoader();

    this._buildScene(mount);
    this._loadStation();
    this._startLoop();
  }

  _buildScene(mount) {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;

    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.1;
    mount.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x020208);

    this._camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400);

    // Ambient: near-black deep blue — space shadow fill
    this._scene.add(new THREE.AmbientLight(0x060c1a, 1.0));

    // Star light — cold blue-white from upper-left, main illumination
    const starLight = new THREE.DirectionalLight(0xc8d8ff, 3.5);
    starLight.position.set(-10, 8, 12);
    this._scene.add(starLight);

    // Rim — cold teal behind ship, separates silhouette from station
    const rimLight = new THREE.DirectionalLight(0x00ccee, 2.2);
    rimLight.position.set(0, 4, -12);
    this._scene.add(rimLight);

    // Warm secondary from right — adds depth to ship detail
    const warmFill = new THREE.DirectionalLight(0x3a2810, 1.2);
    warmFill.position.set(8, -3, 6);
    this._scene.add(warmFill);

    const pCount = 1400;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 120;
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
    }
    this._pGeo = new THREE.BufferGeometry();
    this._pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this._pMat = new THREE.PointsMaterial({ color: 0x99aabb, size: 0.22, sizeAttenuation: true });
    this._scene.add(new THREE.Points(this._pGeo, this._pMat));

    this._stationGroup = new THREE.Group();
    this._scene.add(this._stationGroup);

    this._shipGroup = new THREE.Group();
    this._scene.add(this._shipGroup);

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    // Bloom highlights station's metallic edges and any emissive elements
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.38, 0.55, 0.88);
    this._composer.addPass(bloom);

    this._onResize = () => {
      if (!this._alive) return;
      const w2 = mount.clientWidth || window.innerWidth;
      const h2 = mount.clientHeight || window.innerHeight;
      this._renderer.setSize(w2, h2);
      this._composer.setSize(w2, h2);
      this._camera.aspect = w2 / h2;
      this._camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this._onResize);
  }

  _loadStation() {
    this._loader.load(
      '/models/spacestation_7_-_procedural.glb',
      (gltf) => {
        if (!this._alive) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        // Center mesh at local origin so stationGroup rotates around (0,0,0)
        model.position.set(-center.x, -center.y, -center.z);

        const wrapper = new THREE.Group();
        wrapper.add(model);
        const maxDim = Math.max(size.x, size.y, size.z);
        wrapper.scale.setScalar(28 / maxDim);

        // Desplazamos la estación entera para que el anillo coincida exactamente con el origen (0,0,0).
        // Invertimos el offset original (0.725, -2.5, 2.5)
        wrapper.position.set(0.45, -2.5, 2.5);
        wrapper.rotation.x = -0.1;  // Fine-tune: inclinar el anillo arriba/abajo
        wrapper.rotation.y = 0;    // Fine-tune: orbitar el anillo sobre su eje vertical
        wrapper.rotation.z = 0;    // Fine-tune: rotar el anillo izquierda/derecha

        this._stationGroup.add(wrapper);
      },
      undefined,
      (err) => console.warn('[ShipSelectionScene] station load failed:', err)
    );
  }

  loadShip(index) {
    if (!this._alive) return;
    this._onLoadStart();
    disposeGroup(this._shipGroup);
    const ship = SHIPS[index];
    this._loader.load(
      ship.url,
      (gltf) => {
        if (!this._alive) return;
        // 1. Calcular caja para centrar la malla en su origen local
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        gltf.scene.position.set(-center.x, -center.y, -center.z);

        // 2. Usar wrapper para escalar y rotar sin arruinar el centro
        const wrapper = new THREE.Group();
        wrapper.add(gltf.scene);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.2 / maxDim;
        wrapper.scale.setScalar(scale);

        if (typeof ship.rotationY === 'number') {
          wrapper.rotation.set(0, ship.rotationY, 0);
        } else {
          wrapper.rotation.set(0, 0, 0);
        }

        const offset = { ...SHIP_SPAWN_OFFSET };
        if (ship.spawnOffset) {
          offset.x += (ship.spawnOffset.x || 0);
          offset.y += (ship.spawnOffset.y || 0);
          offset.z += (ship.spawnOffset.z || 0);
        }
        wrapper.position.set(offset.x, offset.y, offset.z);

        this._shipGroup.add(wrapper);

        // === DEBUG: axis markers — remove when boosters are calibrated ===
        {
          const r = Math.max(size.x, size.y, size.z) * 0.035;
          const geo = new THREE.SphereGeometry(r, 8, 8);
          const halfX = size.x / 2, halfY = size.y / 2, halfZ = size.z / 2;
          [
            { pos: [ halfX,  0,      0     ], color: 0xff0000 }, // +X rojo
            { pos: [-halfX,  0,      0     ], color: 0x880000 }, // -X rojo oscuro
            { pos: [0,       halfY,  0     ], color: 0x00ff00 }, // +Y verde
            { pos: [0,      -halfY,  0     ], color: 0x008800 }, // -Y verde oscuro
            { pos: [0,       0,      halfZ ], color: 0x4488ff }, // +Z azul
            { pos: [0,       0,     -halfZ ], color: 0x112255 }, // -Z azul oscuro
          ].forEach(({ pos, color }) => {
            const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
            m.position.set(...pos);
            m.name = 'debug_axis';
            m.visible = false;
            wrapper.add(m);
          });
          console.log(`[HANGAR DEBUG] ${ship.id} | bbox: x=${size.x.toFixed(2)} y=${size.y.toFixed(2)} z=${size.z.toFixed(2)} | scale=${scale.toFixed(3)} | rotationY=${ship.rotationY}`);
        }
        // === FIN DEBUG ===

        // Clear previous boosters and mixers
        this._boosters.forEach(b => b.dispose());
        this._boosters = [];
        this._mixers = [];

        if (ship.id === 'cb1' || ship.id === 'colaid1') {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.animations.forEach(clip => mixer.clipAction(clip).play());
          this._mixers.push(mixer);
        } else {
          const prefix = `hangar_${ship.id}_`;
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
              else if (config.flipZ) booster._root.rotation.y = Math.PI;
              booster.setHangarMode(true);
              this._boosters.push(booster);
            });
        }

        this._saveModelOriginals(wrapper);

        // 3. Fijar cámara rígida al centro del anillo
        this._focal.set(0, 0, 0);

        if (this._alive) this._onLoadEnd();
      },
      undefined,
      (err) => {
        console.warn('[ShipSelectionScene] ship load failed:', ship.url, err);
        if (this._alive) this._onLoadEnd();
      }
    );
  }

  _saveModelOriginals(model) {
    const originals = [];
    model.traverse((obj) => {
      if (obj.isMesh || obj.isGroup) {
        originals.push({
          uuid: obj.uuid,
          position: obj.position.clone(),
          rotation: obj.rotation.clone(),
          scale: obj.scale.clone(),
        });
      }
    });
    this._modelsOriginals.set(model.uuid, originals);
  }

  _restoreModelOriginals(model) {
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

  freezeModels() {
    this._stationRotating = false;
    this._mixers.forEach(m => { if (m) m.timeScale = 0; });
    [this._shipGroup, this._stationGroup].forEach(group => {
      if (!group) return;
      group.traverse(obj => {
        if (obj.isMesh || obj.isGroup) obj.matrixAutoUpdate = false;
      });
    });
  }

  unfreezeModels() {
    this._stationRotating = this._autoRotate;
    this._mixers.forEach(m => { if (m) m.timeScale = 1; });
    [this._shipGroup, this._stationGroup].forEach(group => {
      if (!group) return;
      group.traverse(obj => {
        if (obj.isMesh || obj.isGroup) obj.matrixAutoUpdate = true;
      });
    });
    if (this._shipGroup) {
      this._shipGroup.children.forEach(ch => this._restoreModelOriginals(ch));
    }
  }

  setAutoRotate(enabled) {
    this._autoRotate = enabled;
    if (enabled) {
      this.unfreezeModels();
    } else {
      this.freezeModels();
    }
  }

  isAutoRotating() { return this._autoRotate; }

  addKey(key) { this._keys.add(key); }
  removeKey(key) { this._keys.delete(key); }

  resetOrbit() {
    Object.assign(this._orbit, { theta: 0.4, phi: 0.28, radius: 4.5 });
  }

  setTopView() {
    // Fija la cámara en la parte superior (casi 90 grados) mirando el techo
    Object.assign(this._orbit, { theta: 0.0, phi: 1.56, radius: 6.0 });
  }

  setBottomView() {
    // Fija la cámara en la parte inferior (casi -90 grados) mirando desde abajo
    Object.assign(this._orbit, { theta: 0.0, phi: -1.56, radius: 6.0 });
  }

  setRearView() {
    // Vista trasera: cámara detrás de la nave mirando los motores
    Object.assign(this._orbit, { theta: Math.PI, phi: 0.0, radius: 5.0 });
  }

  setSideView() {
    // Vista lateral: cámara al costado derecho de la nave
    Object.assign(this._orbit, { theta: Math.PI / 2, phi: 0.0, radius: 5.0 });
  }

  toggleDebugMarkers() {
    this._shipGroup.traverse(obj => {
      if (obj.name === 'debug_axis') obj.visible = !obj.visible;
    });
  }

  startDrag(x, y) {
    this._orbit.isDragging = true;
    this._orbit.lastX = x;
    this._orbit.lastY = y;
  }

  drag(x, y) {
    const o = this._orbit;
    if (!o.isDragging) return;
    o.theta -= (x - o.lastX) * 0.008;
    o.phi = Math.max(o.phiMin, Math.min(o.phiMax, o.phi + (y - o.lastY) * 0.005));
    o.lastX = x;
    o.lastY = y;
  }

  endDrag() { this._orbit.isDragging = false; }

  zoom(delta) {
    const o = this._orbit;
    o.radius = Math.max(o.radiusMin, Math.min(o.radiusMax, o.radius + delta * 0.006));
  }

  _startLoop() {
    const animate = () => {
      this._rafId = requestAnimationFrame(animate);
      const o = this._orbit;
      const k = this._keys;

      if (k.has('a') || k.has('A')) o.theta -= 0.022;
      if (k.has('d') || k.has('D')) o.theta += 0.022;
      if (k.has('w') || k.has('W')) o.radius = Math.max(o.radiusMin, o.radius - 0.05);
      if (k.has('s') || k.has('S')) o.radius = Math.min(o.radiusMax, o.radius + 0.05);

      const rotating = k.has('a') || k.has('A') || k.has('d') || k.has('D');
      if (this._autoRotate && !o.isDragging && !rotating) o.theta += 0;

      const { theta, phi, radius } = o;
      const f = this._focal;
      this._camera.position.set(
        f.x + radius * Math.cos(phi) * Math.sin(theta),
        f.y + radius * Math.sin(phi),
        f.z + radius * Math.cos(phi) * Math.cos(theta),
      );
      this._camera.lookAt(f);

      // Station drifts very slowly — gives scene life without distraction
      if (this._stationRotating) this._stationGroup.rotation.y += 0;

      this._boosters.forEach(b => b.update(0.016, false, 0.8, 0.8, false));
      this._mixers.forEach(m => m?.update(0.016));

      this._composer.render();
    };
    animate();
  }

  destroy() {
    this._alive = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._onResize);
    this._boosters.forEach(b => b.dispose());
    this._boosters = [];
    disposeGroup(this._shipGroup);
    disposeGroup(this._stationGroup);
    this._pGeo.dispose();
    this._pMat.dispose();
    this._composer.dispose();
    this._renderer.dispose();
    if (this._renderer.domElement.parentNode) {
      this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
    }
  }
}
