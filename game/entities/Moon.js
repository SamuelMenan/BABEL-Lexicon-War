import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AssetLoader } from '../core/AssetLoader.js';
import { getSoftGlowTexture } from '../../shared/softVisuals.js';
import { BLOOM_LAYER } from '../../shared/constants.js';

export class Moon {
  constructor(scene) {
    this._scene = scene;
    this._moon = null;
    this._moonLight = null;
    this._moonRings = [];
    this._torusRings = [];
    this._coreRings = [];
    this._coreGroup = null;
  }

  load() {
    const url = '/models/truth_about_the_dark_side_of_the_moon.glb';
    const cached = AssetLoader.getGLTF(url);
    if (cached) { this._applyMoonGLTF(cached); return; }
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => { AssetLoader.setGLTF(url, gltf); this._applyMoonGLTF(gltf); },
      undefined, (err) => console.warn('Moon model could not be loaded.', err));
  }

  _applyMoonGLTF(gltf) {
    const root = gltf?.scene;
    if (!root) return;
    const box = new THREE.Box3().setFromObject(root);
    if (!box.isEmpty()) {
      root.position.sub(box.getCenter(new THREE.Vector3()));
      const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
      root.scale.setScalar(38 / (Math.max(size.x, size.y, size.z) || 1));
    }
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.layers.enable(BLOOM_LAYER);
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => {
        if (!mat) return;
        if (mat.isMeshBasicMaterial) {
          const stdMat = new THREE.MeshStandardMaterial({ color: mat.color ?? new THREE.Color(0x888888), roughness: 0.85, metalness: 0.05 });
          Object.assign(mat, stdMat);
        } else {
          mat.roughness = mat.roughness ?? 0.85;
          mat.metalness = mat.metalness ?? 0.05;
        }
        mat.toneMapped = false;
        mat.needsUpdate = true;
      });
    });
    root.position.set(0, 0, -78);
    root.rotation.y = -Math.PI * 0.25;
    this._scene.add(root);
    this._moon = root;
    const keyLight = new THREE.PointLight(0xffe8b0, 1800, 72);
    keyLight.position.set(-22, 18, -65);
    this._scene.add(keyLight);
    this._moonLight = keyLight;
    this._buildCore();
    this._buildRings();
    this._buildEnvironment();
  }

  update(delta) {
    if (this._moon) this._moon.rotation.y -= delta * 0.08;
    const rSpeeds = [0.055, 0.042, 0.038, 0.038, 0.035, 0.07, 0.032, 0.018];
    this._moonRings.forEach((r, i) => { r.rotation.y += delta * (rSpeeds[i] ?? 0.04); });
    this._torusRings.forEach(r => { r.rotation.z -= delta * 0.04; });
    if (this._coreGroup) {
      this._coreGroup.rotation.y += delta * 0.12;
      this._coreRings.forEach(grp => {
        const rs = grp.userData.rotSpeed;
        grp.rotation.x += delta * rs[0]; grp.rotation.y += delta * rs[1]; grp.rotation.z += delta * rs[2];
      });
    }
  }

  dispose() {
    if (this._moon) { this._moon.removeFromParent(); this._moon = null; }
    if (this._moonLight) { this._moonLight.removeFromParent(); this._moonLight = null; }
  }

  _buildCore() {
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0, -78);

    coreGroup.add(new THREE.PointLight(0xffcc44, 2800, 85));

    const hullGeo = new THREE.IcosahedronGeometry(4.5, 1);
    const hullMesh = new THREE.LineSegments(
      new THREE.EdgesGeometry(hullGeo),
      new THREE.LineBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.9 })
    );
    hullMesh.layers.enable(BLOOM_LAYER);
    coreGroup.add(hullMesh);
    hullGeo.dispose();

    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 })
    );
    coreMesh.layers.enable(BLOOM_LAYER);
    coreGroup.add(coreMesh);

    const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getSoftGlowTexture(), color: 0xffcc44,
      transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    glowSpr.scale.set(28, 28, 1);
    glowSpr.layers.enable(BLOOM_LAYER);
    coreGroup.add(glowSpr);

    const ringDefs = [
      { r: 7.0, tube: 0.18, rotX: Math.PI / 3,   speed: [0, 0.8, 0] },
      { r: 7.0, tube: 0.18, rotZ: Math.PI / 2.5,  speed: [0.7, 0, 0] },
      { r: 5.0, tube: 0.12, rotX: Math.PI / 1.5,  speed: [0, -1.2, 0] },
      { r: 3.5, tube: 0.09, rotZ: Math.PI / 1.2,  speed: [-0.6, 0.4, 0] },
    ];
    this._coreRings = [];
    ringDefs.forEach(rd => {
      const rmesh = new THREE.Mesh(
        new THREE.TorusGeometry(rd.r, rd.tube, 6, 32),
        new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 1.8 })
      );
      rmesh.layers.enable(BLOOM_LAYER);
      const grp = new THREE.Group();
      grp.add(rmesh);
      if (rd.rotX !== undefined) grp.rotation.x = rd.rotX;
      if (rd.rotZ !== undefined) grp.rotation.z = rd.rotZ;
      grp.userData.rotSpeed = rd.speed;
      this._coreRings.push(grp);
      coreGroup.add(grp);
    });

    this._coreGroup = coreGroup;
    this._scene.add(coreGroup);
  }

  _buildRings() {
    const makeShapeTex = (shape) => {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillStyle = '#ffffff';
      const cx = 16, cy = 16, r = 13;
      if (shape === 'square') {
        ctx.fillRect(4, 4, 24, 24);
      } else if (shape === 'diamond') {
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill();
      } else if (shape === 'cross') {
        ctx.fillRect(cx - 3, cy - r, 6, r * 2); ctx.fillRect(cx - r, cy - 3, r * 2, 6);
      } else if (shape === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const b = a + (2 * Math.PI) / 10;
          i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
          ctx.lineTo(cx + (r * 0.45) * Math.cos(b), cy + (r * 0.45) * Math.sin(b));
        }
        ctx.closePath(); ctx.fill();
      } else {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }
      return new THREE.CanvasTexture(c);
    };

    const makeRing = (count, rMin, rMax, tiltX, sz, op, color, shape) => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = rMin + Math.random() * (rMax - rMin);
        pos[i*3] = r * Math.cos(theta); pos[i*3+1] = (Math.random() - 0.5) * 0.5; pos[i*3+2] = r * Math.sin(theta);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const tex = makeShapeTex(shape);
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color, size: sz, sizeAttenuation: true, transparent: true, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: 0.01, map: tex, alphaMap: tex
      }));
      pts.position.set(0, 0, -78); pts.rotation.x = tiltX; pts.frustumCulled = false;
      pts.layers.enable(BLOOM_LAYER);
      this._scene.add(pts);
      this._moonRings.push(pts);
    };

    const addTorus = (radius, tube, color, opacity, yOff = -4) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 4, 120),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
      );
      mesh.position.set(0, yOff, -78); mesh.rotation.x = 0.15;
      mesh.layers.enable(BLOOM_LAYER);
      this._scene.add(mesh);
      this._torusRings.push(mesh);
    };

    makeRing(600,  13, 20,  Math.PI / 2.6, 0.07, 0.85, 0xaaddff, 'circle');
    makeRing(800,  21, 31,  Math.PI / 2.4, 0.28, 0.88, 0xfff4e0, 'square');
    addTorus(34.0, 0.28, 0xfff8ee, 0.88, -4);
    makeRing(500,  33, 42,  Math.PI / 2.2, 0.16, 0.72, 0xffffff, 'diamond');
    makeRing(700,  44, 56,  Math.PI / 2.0, 0.06, 0.65, 0xc8d8ff, 'cross');
    makeRing(400,  58, 68,  Math.PI / 1.85, 0.22, 0.45, 0xe0eeff, 'star');
    makeRing(2200, 54, 65,  Math.PI / 2.3, 0.85, 0.82, 0xffffff, 'circle');
    addTorus(51.0, 0.22, 0xfff8ee, 0.75, -10);
    addTorus(52.2, 0.12, 0xffeedd, 0.45, -10);
  }

  _buildEnvironment() {
    const rimLight = new THREE.PointLight(0x2255cc, 500, 62);
    rimLight.position.set(24, -12, -65);
    this._scene.add(rimLight);

    this._scene.add(new THREE.AmbientLight(0x030508, 1.5));

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(22, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.FrontSide })
    );
    halo.position.set(0, 0, -78); halo.renderOrder = -1;
    this._scene.add(halo);

    const debrisCount = 180;
    const debrisPos = new Float32Array(debrisCount * 3);
    for (let i = 0; i < debrisCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 22 + Math.random() * 18;
      debrisPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      debrisPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      debrisPos[i*3+2] = -78 + r * Math.cos(phi);
    }
    const debrisGeo = new THREE.BufferGeometry();
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));
    const debris = new THREE.Points(debrisGeo, new THREE.PointsMaterial({
      color: 0x8899cc, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    debris.layers.enable(BLOOM_LAYER);
    this._scene.add(debris);
  }
}
