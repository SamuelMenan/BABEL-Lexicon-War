import * as THREE from 'three';
import { PROJECTILE_DEFAULTS } from '../../rendering/booster/MuzzleConfig.js';

// Continuous beam per muzzle. Mimics bolt look (core/glow/halo additive cylinders)
// but stretched to a long sustained ray. Refreshed each frame from getMuzzleShots().

const BEAM_LENGTH   = PROJECTILE_DEFAULTS.maxDist; // scene units
const CORE_RADIUS   = 0.012;
const GLOW_RADIUS   = 0.034;
const HALO_RADIAL   = 1.4;
// Empuja el inicio del haz un pelo delante del anchor para que el nucleo
// solido nazca en la boca y nunca se proyecte hacia atras dentro del casco.
const MUZZLE_EPSILON = 0.02;
// Anillo de boquilla — aro aditivo en cada cañon, color de la paleta.
const RING_RADIUS = GLOW_RADIUS * 2.2;
const RING_TUBE   = GLOW_RADIUS * 0.35;

const ALIGN_AXIS = new THREE.Vector3(0, 1, 0);

export class HangarLaser {
  constructor(scene) {
    this._scene = scene;

    this._coreGeo = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, BEAM_LENGTH, 10, 1, false);
    this._glowGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, BEAM_LENGTH, 12, 1, false);
    this._haloGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, BEAM_LENGTH * 1.04, 12, 1, false);
    // Mover origen de cada geometria a su BASE (-Y) en lugar del centro.
    // Resultado: cilindro ocupa Y ∈ [0, L] en local. Al posicionar el root en
    // la boca del cañon y rotar +Y→dir, todo el volumen se proyecta SOLO hacia
    // dir (jamas detras).
    this._coreGeo.translate(0, BEAM_LENGTH * 0.5, 0);
    this._glowGeo.translate(0, BEAM_LENGTH * 0.5, 0);
    this._haloGeo.translate(0, BEAM_LENGTH * 1.04 * 0.5, 0);

    // Torus default: plano XY, eje = +Z. Rotamos a eje = +Y para usar la misma
    // alineacion setFromUnitVectors(+Y, dir) que el haz.
    this._ringGeo = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 8, 20);
    this._ringGeo.rotateX(Math.PI / 2);

    this._coreMats = new Map();
    this._glowMats = new Map();
    this._haloMats = new Map();
    this._ringMats = new Map();

    this._beams = []; // active beams, indexed per muzzle slot
    this._rings = []; // active muzzle rings, indexed per muzzle slot
    this._time  = 0;
  }

  _coreMat(color) {
    let m = this._coreMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false, depthTest: true, toneMapped: false,
      });
      this._coreMats.set(color, m);
    }
    return m;
  }
  _glowMat(color) {
    let m = this._glowMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false, depthTest: true, toneMapped: false,
        side: THREE.DoubleSide,
      });
      this._glowMats.set(color, m);
    }
    return m;
  }
  _haloMat(color) {
    let m = this._haloMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false, depthTest: true, toneMapped: false,
      });
      this._haloMats.set(color, m);
    }
    return m;
  }

  _ringMat(color) {
    let m = this._ringMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false, depthTest: true, toneMapped: false,
        side: THREE.DoubleSide,
      });
      this._ringMats.set(color, m);
    }
    return m;
  }

  _ensureRing(index, color) {
    let r = this._rings[index];
    if (!r) {
      const mesh = new THREE.Mesh(this._ringGeo, this._ringMat(color));
      mesh.renderOrder = 9999;
      this._scene.add(mesh);
      r = { mesh, color };
      this._rings[index] = r;
    } else if (r.color !== color) {
      r.mesh.material = this._ringMat(color);
      r.color = color;
      r.mesh.visible = true;
    } else {
      r.mesh.visible = true;
    }
    return r;
  }

  _ensureBeam(index, color) {
    let b = this._beams[index];
    if (!b) {
      const root = new THREE.Group();
      const core = new THREE.Mesh(this._coreGeo, this._coreMat(color));
      const glow = new THREE.Mesh(this._glowGeo, this._glowMat(color));
      const halo = new THREE.Mesh(this._haloGeo, this._haloMat(color));
      halo.scale.set(HALO_RADIAL, 1.0, HALO_RADIAL);
      root.renderOrder = 9999;
      core.renderOrder = 9999;
      glow.renderOrder = 9998;
      halo.renderOrder = 9997;
      root.add(glow); root.add(core); root.add(halo);
      this._scene.add(root);
      b = { root, core, glow, halo, color };
      this._beams[index] = b;
    } else if (b.color !== color) {
      b.core.material = this._coreMat(color);
      b.glow.material = this._glowMat(color);
      b.halo.material = this._haloMat(color);
      b.color = color;
      b.root.visible = true;
    } else {
      b.root.visible = true;
    }
    return b;
  }

  // shots: [{ origin: Vec3, dir: Vec3, color, emissive }, ...]
  update(shots, dt = 0) {
    this._time += dt;
    const pulse = 1.0 + 0.08 * Math.sin(this._time * 24);

    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      const color = s.color ?? 0xff2222;
      const scale = s.scale ?? 1.0;
      const beam = this._ensureBeam(i, color);
      const ring = this._ensureRing(i, color);
      const dir = s.dir.clone().normalize();
      // Geometria trasladada: base en Y=0, punta en Y=+L. Root va a la boca.
      // Rotacion +Y → dir asegura que la totalidad del haz vive en +dir.
      const start = s.origin.clone().addScaledVector(dir, MUZZLE_EPSILON);
      beam.root.position.copy(start);
      beam.root.quaternion.setFromUnitVectors(ALIGN_AXIS, dir);
      beam.root.scale.setScalar(scale);
      beam.halo.scale.set(HALO_RADIAL * pulse, 1.0, HALO_RADIAL * pulse);
      // Anillo en la boca, plano perpendicular a dir.
      ring.mesh.position.copy(start);
      ring.mesh.quaternion.setFromUnitVectors(ALIGN_AXIS, dir);
      ring.mesh.scale.setScalar(scale);
    }
    // Hide unused beams/rings (e.g. ship change with fewer muzzles).
    for (let i = shots.length; i < this._beams.length; i++) {
      if (this._beams[i]) this._beams[i].root.visible = false;
    }
    for (let i = shots.length; i < this._rings.length; i++) {
      if (this._rings[i]) this._rings[i].mesh.visible = false;
    }
  }

  clear() {
    for (const b of this._beams) if (b) b.root.visible = false;
    for (const r of this._rings) if (r) r.mesh.visible = false;
  }

  dispose() {
    for (const b of this._beams) {
      if (!b) continue;
      this._scene.remove(b.root);
    }
    for (const r of this._rings) {
      if (!r) continue;
      this._scene.remove(r.mesh);
    }
    this._beams.length = 0;
    this._rings.length = 0;
    this._coreGeo.dispose();
    this._glowGeo.dispose();
    this._haloGeo.dispose();
    this._ringGeo.dispose();
    this._coreMats.forEach(m => m.dispose()); this._coreMats.clear();
    this._glowMats.forEach(m => m.dispose()); this._glowMats.clear();
    this._haloMats.forEach(m => m.dispose()); this._haloMats.clear();
    this._ringMats.forEach(m => m.dispose()); this._ringMats.clear();
  }
}
