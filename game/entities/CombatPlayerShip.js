import * as THREE from 'three';
import { ShipBase } from './ShipBase.js';
import { COLORS } from '../../shared/constants.js';

const COMBAT_MODEL_URL = '/models/spaceshipnew.glb';
const TARGET_MODEL_LENGTH = 3.8;
const COMBAT_MODEL_YAW = Math.PI + 0.75;
const CYAN_ARTIFACT_MAX_SIZE = 0.62;
const CYAN_ARTIFACT_MIN_Y = 0.35;

export class CombatPlayerShip extends ShipBase {
  constructor() {
    super({ modelUrl: COMBAT_MODEL_URL, targetLength: TARGET_MODEL_LENGTH, yaw: COMBAT_MODEL_YAW });
    this._recoil = 0;
    this._hitShake = 0;
    this._targetPos = null;
    this._basePosition = new THREE.Vector3(0, 0.2, 2.85);

    this._muzzle = null;
    this._flash = null;
    this._light = null;
    this._lightRim = null;
    this._lightFill = null;
    this._lightBack = null;

    this._buildFxNodes();
    this._buildFallbackShip();
    this._loadModel();

    this._group.position.copy(this._basePosition);
    this._collapsing = false;
    this._collapseT = 0;
    this._collapseOnDone = null;
    this._collapseDone = false;
    this._collapseScene = null;
    this._debrisFrags = [];
    this._fxFlash = null;
    this._fxRing = null;
    this._fxLight = null;
  }

  get position() { return this._group.position; }

  _buildFxNodes() {
    const cyan = COLORS.PLAYER;

    this._muzzle = new THREE.Object3D();
    this._group.add(this._muzzle);

    const flashMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: cyan,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0,
    });
    this._flash = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), flashMat);
    this._group.add(this._flash);

    this._light = this._makePointLight(0xd8e8ff, 3.8, 13, new THREE.Vector3(-0.2, 1.2, -0.45));
    this._group.add(this._light);

    this._lightRim = this._makePointLight(0x79ffd6, 2.6, 11, new THREE.Vector3(0.12, -0.3, 1.4));
    this._group.add(this._lightRim);

    this._lightFill = this._makePointLight(0xffffff, 3.0, 11, new THREE.Vector3(0, 0.35, -1.35));
    this._group.add(this._lightFill);

    this._lightBack = this._makePointLight(0xfff1d8, 3.4, 12, new THREE.Vector3(0, 0.35, 1.95));
    this._group.add(this._lightBack);

    this._setSocketPositions({ centerX: 0, centerY: 0, frontZ: -0.95 });
  }

  _setSocketPositions({ centerX, centerY, frontZ }) {
    this._muzzle.position.set(centerX, centerY, frontZ);
    this._flash.position.set(centerX, centerY, frontZ);
  }

  _buildFallbackShip() {
    this._clearAnimations();
    this._clearShipRoot();

    const cyan = COLORS.PLAYER;

    const bodyGeo = new THREE.ConeGeometry(0.42, 1.8, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: cyan,
      emissive: cyan,
      emissiveIntensity: 0.35,
      metalness: 0.7,
      roughness: 0.25,
    });
    this._shipRoot.add(new THREE.Mesh(bodyGeo, bodyMat));

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.4, 1.3, -0.1, 0.9, 0.25, -0.05, -0.6,
      0, 0, 0.4, -1.3, -0.1, 0.9, -0.25, -0.05, -0.6,
    ]), 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: cyan,
      emissive: cyan,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.2,
    });
    this._shipRoot.add(new THREE.Mesh(wingGeo, wingMat));

    this._setSocketPositions({ centerX: 0, centerY: 0, frontZ: -0.95 });
  }

  _tuneLoadedMesh(node) {
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) return;
      if ('color' in material && material.color) {
        material.color.lerp(new THREE.Color(0xffffff), 0.22);
      }
      if ('emissive' in material && material.emissive) {
        material.emissive = new THREE.Color(0.85, 0.52, 0.18);
        material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 3.5);
      }
      if ('metalness' in material) material.metalness = Math.min(0.40, (material.metalness ?? 0.5) * 0.55);
      if ('roughness' in material) material.roughness = Math.max(0.08, (material.roughness ?? 0.7) - 0.50);
      if ('envMapIntensity' in material) material.envMapIntensity = Math.max(material.envMapIntensity ?? 0, 1.8);
      material.needsUpdate = true;
    });
  }

  _afterLoadedModel(modelRoot) {
    const rootBox = new THREE.Box3().setFromObject(modelRoot);
    const rootCenter = rootBox.getCenter(new THREE.Vector3());
    const rootSize = rootBox.getSize(new THREE.Vector3());
    const rootMax = Math.max(rootSize.x, rootSize.y, rootSize.z);

    // Some kitbashed GLBs include cyan helper planes floating around the ship.
    // Hide only small/detached cyan meshes to avoid touching the hull geometry.
    modelRoot.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      const cyanish = mats.some((m) => {
        const c = m?.emissive ?? m?.color;
        return !!c && c.g > 0.5 && c.b > 0.52 && c.r < 0.35;
      });
      // Also catch blue (non-cyan) helpers: high-b, low-g, low-r
      const blueish = mats.some((m) => {
        const c = m?.emissive ?? m?.color;
        return !!c && c.b > 0.45 && c.r < 0.25 && c.g < 0.38;
      });
      const isColorArtifact = cyanish || blueish;
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxSide = Math.max(size.x, size.y, size.z);

      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
      const thinPlane = dims[0] <= Math.max(0.018, rootMax * 0.008);
      const compact = maxSide <= Math.max(CYAN_ARTIFACT_MAX_SIZE, rootMax * 0.18);
      const aboveHull = center.y >= (rootCenter.y + Math.max(CYAN_ARTIFACT_MIN_Y, rootSize.y * 0.14));
      const detached = center.distanceTo(rootCenter) >= rootMax * 0.28;
      const byName = /helper|debug|plane|quad|billboard|sprite|cube|fx|square|rect/i.test(node.name ?? '');

      if ((cyanish && (aboveHull || detached)) ||
          (blueish && (aboveHull || detached) && (thinPlane || byName)) ||
          (compact && (aboveHull || detached) && thinPlane) ||
          (compact && detached && byName)) {
        node.visible = false;
      }
    });

    const finalBox = new THREE.Box3().setFromObject(modelRoot);
    if (!finalBox.isEmpty()) {
      this._setSocketPositions({
        centerX: 0,
        centerY: 0,
        frontZ: finalBox.min.z - 0.15,
      });
    }
  }

  setTarget(pos) { this._targetPos = pos; }
  clearTarget() { this._targetPos = null; }

  get muzzlePosition() {
    const pos = new THREE.Vector3();
    this._muzzle.getWorldPosition(pos);
    return pos;
  }

  fireAnim() {
    this._recoil = 1;
    this._flash.material.opacity = 0.8;
    clearTimeout(this._fireAnimTimer);
    this._fireAnimTimer = setTimeout(() => {
      this._fireAnimTimer = null;
      if (this._flash?.material) this._flash.material.opacity = 0;
    }, 80);
  }

  takeHit(strength = 1) {
    const s = Math.max(0.2, Number(strength) || 1);
    this._hitShake = Math.max(this._hitShake, Math.min(1.2, 0.55 * s));
    this._recoil = Math.max(this._recoil, 0.35 * s);
  }

  update(delta) {
    if (this._collapsing) { this._updateCollapse(delta); return; }
    super.update(delta);

    const floatY = Math.sin(this._t * 1.2) * 0.12;
    const shakeY = this._hitShake > 0 ? Math.sin(this._t * 28) * this._hitShake * 0.35 : 0;
    if (this._hitShake > 0) this._hitShake = Math.max(0, this._hitShake - delta * 4);
    this._group.position.y = this._basePosition.y + floatY + shakeY;

    const tx = this._targetPos ? this._targetPos.x : 0;
    const snapX = tx < -6 ? -4.3 : tx > 6 ? 4.3 : 0;
    this._group.position.x += (snapX - this._group.position.x) * Math.min(delta * 3, 1);

    if (this._targetPos) {
      const dir = new THREE.Vector3().subVectors(this._targetPos, this._group.position).normalize();
      dir.y = -0.25;
      dir.normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        dir,
      );
      this._group.quaternion.slerp(targetQuat, delta * 3);
    } else {
      this._group.quaternion.slerp(new THREE.Quaternion(), delta * 2);
    }

    if (this._recoil > 0) {
      this._group.position.z = this._basePosition.z + this._recoil * 0.24;
      this._recoil = Math.max(0, this._recoil - delta * 8);
    } else {
      this._group.position.z = this._basePosition.z + Math.sin(this._t * 0.35) * 0.02;
    }

    this._light.intensity = 3.8 + Math.sin(this._t * 3) * 0.18 + this._recoil * 0.6;
    this._lightRim.intensity = 2.6 + Math.sin(this._t * 4) * 0.14 + this._recoil * 0.4;
    if (this._lightFill) this._lightFill.intensity = 3.0 + Math.sin(this._t * 2.4) * 0.14 + this._recoil * 0.3;
    if (this._lightBack) this._lightBack.intensity = 3.4 + Math.sin(this._t * 2.2) * 0.16 + this._recoil * 0.4;
  }


  startCollapse(scene, onDone) {
    if (this._collapsing) return;
    this._collapsing = true;
    this._collapseT = 0;
    this._collapseDone = false;
    this._collapseScene = scene;
    this._collapseOnDone = onDone ?? null;
    this._fxFlash = null;
    this._fxRing = null;
    this._fxLight = null;
    this._group.traverse(node => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(mat => { mat.transparent = true; mat.needsUpdate = true; });
    });
    this._spawnCollapseFx();
  }

  _spawnCollapseFx() {
    const scene = this._collapseScene;
    if (!scene) return;
    const o = this._group.position.clone();

    const flashGeo = new THREE.SphereGeometry(2.2, 8, 8);
    const flashMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 8,
      transparent: true, opacity: 1, depthWrite: false,
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(o);
    flashMesh.layers.enable(1);
    scene.add(flashMesh);
    this._fxFlash = { mesh: flashMesh };

    const ringGeo = new THREE.TorusGeometry(1, 0.09, 6, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 4,
      transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(o);
    ringMesh.layers.enable(1);
    scene.add(ringMesh);
    this._fxRing = { mesh: ringMesh };

    const deathLight = new THREE.PointLight(0xffffff, 10, 25);
    deathLight.position.copy(o);
    scene.add(deathLight);
    this._fxLight = { light: deathLight };

    this._debrisFrags = [];
    const cols = [COLORS.PLAYER, 0x55c8ff, 0xffffff, 0x8dfcff, 0x3a8bff];
    for (let i = 0; i < 12; i++) {
      const c = cols[i % cols.length];
      const s = 0.28 + Math.random() * 0.52;
      let geo;
      if (i % 4 === 0) geo = new THREE.OctahedronGeometry(s);
      else if (i % 4 === 1) geo = new THREE.IcosahedronGeometry(s * 1.2, 0);
      else if (i % 4 === 2) geo = new THREE.TetrahedronGeometry(s * 1.5);
      else geo = new THREE.ConeGeometry(s * 0.55, s * 2.5, 4);
      const mat = new THREE.MeshStandardMaterial({
        color: c, emissive: c, emissiveIntensity: 4.0,
        transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(o);
      mesh.position.x += (Math.random() - 0.5) * 0.8;
      mesh.position.y += (Math.random() - 0.5) * 0.6;
      mesh.position.z += (Math.random() - 0.5) * 0.6;
      mesh.layers.enable(1);
      scene.add(mesh);
      const spd = 5 + Math.random() * 7;
      const a = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const vel = new THREE.Vector3(
        Math.cos(a) * spd,
        Math.sin(a) * spd + (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 6,
      );
      const rotV = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      );
      const startT = 0.08 + Math.random() * 0.10;
      const life = 1.8 + Math.random() * 0.9;
      this._debrisFrags.push({ mesh, vel, rotV, age: 0, startT, life });
    }
  }

  _updateCollapse(delta) {
    if (this._collapseDone) return;
    const TOTAL = 2.8;
    this._collapseT += delta;
    const t = Math.min(this._collapseT / TOTAL, 1);

    // Flash sphere: appears at death, fades in 0.22s
    if (this._fxFlash) {
      const ft = Math.min(1, this._collapseT / 0.22);
      this._fxFlash.mesh.material.opacity = 1 - ft;
      if (ft >= 1) {
        this._collapseScene?.remove(this._fxFlash.mesh);
        this._fxFlash.mesh.geometry.dispose();
        this._fxFlash.mesh.material.dispose();
        this._fxFlash = null;
      }
    }

    // Shockwave ring: expands from scale 0.1 to 9 over 0.55s
    if (this._fxRing) {
      const rt = Math.min(1, this._collapseT / 0.55);
      this._fxRing.mesh.scale.setScalar(0.1 + rt * 8.9);
      this._fxRing.mesh.material.opacity = rt < 0.08 ? 1 : Math.max(0, 1 - (rt - 0.08) / 0.92);
      if (rt >= 1) {
        this._collapseScene?.remove(this._fxRing.mesh);
        this._fxRing.mesh.geometry.dispose();
        this._fxRing.mesh.material.dispose();
        this._fxRing = null;
      }
    }

    // Death light: intense flash fades over 0.45s
    if (this._fxLight) {
      const lt = Math.min(1, this._collapseT / 0.45);
      this._fxLight.light.intensity = 10 * (1 - lt);
      if (lt >= 1) {
        this._collapseScene?.remove(this._fxLight.light);
        this._fxLight = null;
      }
    }

    // Ship hull: small scale pulse then sine wobble (NOT random jitter)
    if (t < 0.12) {
      this._group.scale.setScalar(1 + (t / 0.12) * 0.30);
    } else if (t < 0.26) {
      this._group.scale.setScalar(1.30 - ((t - 0.12) / 0.14) * 0.30);
    }

    if (t >= 0.10) {
      const wAmp = Math.min(0.55, (t - 0.10) / 0.35 * 0.55);
      const f1 = 16 + t * 28;
      const f2 = 21 + t * 34;
      this._group.position.x = this._basePosition.x + Math.sin(this._collapseT * f1) * wAmp * 0.40;
      this._group.position.y = this._basePosition.y + Math.sin(this._collapseT * f2) * wAmp * 0.32;
      this._group.rotation.z  = Math.sin(this._collapseT * (f1 * 0.65)) * wAmp * 0.50;
      this._group.rotation.x  = Math.sin(this._collapseT * (f2 * 0.55)) * wAmp * 0.22;
    }

    // Ship stays opaque until t=0.55, then fades
    const opacity = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);

    // Softer lexical shimmer to avoid harsh strobe while collapsing
    const shimmer = t > 0.12 && t < 0.92
      ? 1.1 + 0.55 * Math.sin(this._collapseT * 24) + 0.2 * Math.sin(this._collapseT * 9)
      : 0.95;
    const emissiveFactor = Math.max(0.35, shimmer);

    this._group.traverse(node => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(mat => {
        mat.opacity = opacity;
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = emissiveFactor * Math.max(0.15, 1 - t * 0.7);
      });
    });
    if (this._light) this._light.intensity = (4.2 + 0.8 * Math.sin(this._collapseT * 18)) * opacity;
    if (this._lightRim) this._lightRim.intensity = (2.8 + 0.5 * Math.sin(this._collapseT * 22)) * opacity;
    if (this._lightFill) this._lightFill.intensity = (3.2 + 0.6 * Math.sin(this._collapseT * 14)) * opacity;
    if (this._lightBack) this._lightBack.intensity = (3.6 + 0.7 * Math.sin(this._collapseT * 17)) * opacity;

    // Debris fragments
    for (const frag of this._debrisFrags) {
      if (t < frag.startT) continue;
      frag.age += delta;
      const ft = Math.min(frag.age / frag.life, 1);
      frag.mesh.position.x += frag.vel.x * delta;
      frag.mesh.position.y += frag.vel.y * delta;
      frag.mesh.position.z += frag.vel.z * delta;
      frag.mesh.rotation.x += frag.rotV.x * delta;
      frag.mesh.rotation.y += frag.rotV.y * delta;
      frag.mesh.rotation.z += frag.rotV.z * delta;
      frag.vel.multiplyScalar(1 - delta * 1.1);
      frag.mesh.material.opacity = ft < 0.06 ? ft / 0.06
        : ft > 0.58 ? Math.max(0, 1 - (ft - 0.58) / 0.42)
        : 1;
      frag.mesh.material.emissiveIntensity = (2.1 + 0.9 * Math.sin(this._collapseT * 16 + frag.age * 12)) * (1 - ft * 0.7);
    }

    if (t >= 1) {
      this._collapseDone = true;
      this._cleanupCollapseFx(this._collapseScene);
      const cb = this._collapseOnDone;
      this._collapseOnDone = null;
      cb?.();
    }
  }

  _cleanupCollapseFx(sceneOverride = null) {
    const scene = sceneOverride ?? this._collapseScene;

    if (this._fxFlash?.mesh) {
      scene?.remove(this._fxFlash.mesh);
      this._fxFlash.mesh.geometry.dispose();
      this._fxFlash.mesh.material.dispose();
    }

    if (this._fxRing?.mesh) {
      scene?.remove(this._fxRing.mesh);
      this._fxRing.mesh.geometry.dispose();
      this._fxRing.mesh.material.dispose();
    }

    if (this._fxLight?.light) {
      scene?.remove(this._fxLight.light);
    }

    this._debrisFrags.forEach((f) => {
      scene?.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
    });

    this._debrisFrags = [];
    this._fxFlash = null;
    this._fxRing = null;
    this._fxLight = null;
  }

  dispose(scene = null) {
    clearTimeout(this._fireAnimTimer);
    this._fireAnimTimer = null;
    this._cleanupCollapseFx(scene);
    this._collapseScene = null;
    this._collapseOnDone = null;
    super.dispose();
  }
}
