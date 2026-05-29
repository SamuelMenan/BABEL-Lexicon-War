import * as THREE from 'three';
import { additiveMat } from './additiveMaterial.js';

// NOTE: NO usa BLOOM_LAYER por la misma razon que BoltVisual: bloom selectivo
// en combate dejaria que el glow se viera a traves del casco.

// Beam aditivo reutilizable (combate laser flow + cualquier escena).
// Cilindros con base trasladada en Y=0 (punta en Y=1). Posicionar root en
// el origen, rotar +Y → dir, scale Y = distancia. Resultado: haz exacto
// desde origin hasta target. depthTest:true → oclusion por geometria.

const CORE_RADIUS = 0.045;
const GLOW_RADIUS = 0.11;
const HALO_RADIAL = 1.35;

let _coreGeo = null;
let _glowGeo = null;
let _haloGeo = null;
function _ensureGeo() {
  if (_coreGeo) return;
  // Length=1, base en Y=0, punta en Y=1.
  _coreGeo = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, 1, 10, 1, false);
  _glowGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, 1, 12, 1, false);
  _haloGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, 1, 12, 1, false);
  _coreGeo.translate(0, 0.5, 0);
  _glowGeo.translate(0, 0.5, 0);
  _haloGeo.translate(0, 0.5, 0);
}

const ALIGN_AXIS = new THREE.Vector3(0, 1, 0);
const _tmpDir    = new THREE.Vector3();

export function createBeam({ color = 0xffffff, scale = 1.0 } = {}) {
  _ensureGeo();

  const coreOp0 = 1.0;
  const glowOp0 = 0.60;
  const haloOp0 = 0.38;

  const coreMat = additiveMat(color, coreOp0);
  const glowMat = additiveMat(color, glowOp0, true);
  const haloMat = additiveMat(color, haloOp0);

  const root = new THREE.Group();
  const core = new THREE.Mesh(_coreGeo, coreMat);
  const glow = new THREE.Mesh(_glowGeo, glowMat);
  const halo = new THREE.Mesh(_haloGeo, haloMat);
  // Halo radial wider; longitudinal sigue al root.
  halo.scale.set(HALO_RADIAL, 1.0, HALO_RADIAL);

  root.renderOrder = 9999;
  core.renderOrder = 9999;
  glow.renderOrder = 9998;
  halo.renderOrder = 9997;
  root.add(glow); root.add(core); root.add(halo);

  const _radial = scale;

  // origin/target: THREE.Vector3 (world).
  function setSegment(origin, target) {
    _tmpDir.subVectors(target, origin);
    const len = Math.max(0.001, _tmpDir.length());
    _tmpDir.multiplyScalar(1 / len);
    root.position.copy(origin);
    root.quaternion.setFromUnitVectors(ALIGN_AXIS, _tmpDir);
    // Scale: radial (X,Z) = _radial; Y = distancia.
    root.scale.set(_radial, len, _radial);
  }

  function fade(k) {
    // k ∈ [0,1]: opacidad relativa al maximo inicial.
    coreMat.opacity = coreOp0 * k;
    glowMat.opacity = glowOp0 * k;
    haloMat.opacity = haloOp0 * k;
  }

  function dispose() {
    coreMat.dispose();
    glowMat.dispose();
    haloMat.dispose();
  }

  return { root, core, glow, halo, setSegment, fade, dispose };
}
