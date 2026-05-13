// Cache compartido de geometrías para enemigos — evita regenerar EdgesGeometry / TorusGeometry
// en cada spawn (drop de FPS al cambiar oleada).

import * as THREE from 'three';

const _sharedEdges = {};
export function getSharedEdges(type, factory) {
  if (!_sharedEdges[type]) {
    const geo = factory();
    _sharedEdges[type] = new THREE.EdgesGeometry(geo);
    geo.dispose();
  }
  return _sharedEdges[type];
}

// Esfera unidad reutilizada para el core — se escala con cfg.coreR
export const sharedCore = new THREE.SphereGeometry(1, 8, 8);

const _sharedRings = {};
export function getSharedRing(r, tube) {
  const key = `${r}_${tube}`;
  if (!_sharedRings[key]) {
    _sharedRings[key] = new THREE.TorusGeometry(r, tube, 6, 24);
  }
  return _sharedRings[key];
}

export function disposeEnemyGeometryCache() {
  for (const k in _sharedEdges) _sharedEdges[k].dispose();
  for (const k in _sharedRings) _sharedRings[k].dispose();
  sharedCore.dispose();
}
