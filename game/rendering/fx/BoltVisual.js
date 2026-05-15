import * as THREE from 'three';

// Bolt aditivo reutilizable (exportado desde hangar a combate).
// Cilindros aditivos: core/glow/halo. depthTest:true → casco/enemigos
// ocluyen el bolt correctamente.
//
// NOTE: NO usa BLOOM_LAYER. En combate el bloom es selectivo (sólo objetos
// con BLOOM_LAYER renderizan en el bloom RT); la nave está en layer 0 y no
// escribiría depth ahí, lo que hace que el glow se vea "a través" del casco.
// El material ya es AdditiveBlending con opacidad alta — el brillo lo da el
// material, no el UnrealBloomPass.

const BOLT_LENGTH = 0.24;
const CORE_RADIUS = 0.007;
const GLOW_RADIUS = 0.022;
const HALO_RADIAL = 1.4;
const HALO_LONG   = 1.1;

// Cylinder default axis = +Y. Mantener para usar setFromUnitVectors(+Y, dir).
let _coreGeo = null;
let _glowGeo = null;
let _haloGeo = null;
function _ensureGeo() {
  if (_coreGeo) return;
  _coreGeo = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, BOLT_LENGTH, 10, 1, false);
  _glowGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, BOLT_LENGTH, 12, 1, false);
  _haloGeo = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, BOLT_LENGTH * 1.15, 12, 1, false);
}

function _makeMat(color, opacity, doubleSide = false) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent:  true,
    opacity,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
    depthTest:    true,
    toneMapped:   false,
    side:         doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// Crea un bolt instanciado (mats propias para poder modular opacidad/disposear).
// Geometrías compartidas vía cache de módulo.
export function createBolt({ color = 0xff2222, scale = 1.0, flowBoost = false } = {}) {
  _ensureGeo();

  const coreOp = 1.0;
  const glowOp = flowBoost ? 0.85 : 0.55;
  const haloOp = flowBoost ? 0.55 : 0.35;

  const coreMat = _makeMat(color, coreOp);
  const glowMat = _makeMat(color, glowOp, true);
  const haloMat = _makeMat(color, haloOp);

  const root = new THREE.Group();
  const core = new THREE.Mesh(_coreGeo, coreMat);
  const glow = new THREE.Mesh(_glowGeo, glowMat);
  const halo = new THREE.Mesh(_haloGeo, haloMat);
  halo.scale.set(HALO_RADIAL, HALO_LONG, HALO_RADIAL);

  root.renderOrder = 9999;
  core.renderOrder = 9999;
  glow.renderOrder = 9998;
  halo.renderOrder = 9997;
  root.add(glow); root.add(core); root.add(halo);
  root.scale.setScalar(scale);

  function dispose() {
    coreMat.dispose();
    glowMat.dispose();
    haloMat.dispose();
  }

  return { root, core, glow, halo, dispose };
}

const BOLT_VISUAL_LENGTH = BOLT_LENGTH;
