import * as THREE from 'three';

// Shared exhaust cone — base at Z=0 (nozzle mouth), tip at +Z (behind ship toward camera).
let _coneGeo = null;
export function getConeGeometry() {
  if (_coneGeo) return _coneGeo;
  _coneGeo = new THREE.CylinderGeometry(0, 1, 1, 8, 1, true);
  _coneGeo.rotateX(Math.PI / 2);
  _coneGeo.translate(0, 0, 0.5);
  return _coneGeo;
}

// Shared nozzle ring — TorusGeometry in XY plane (faces Z by default).
let _ringGeo = null;
export function getRingGeometry() {
  if (_ringGeo) return _ringGeo;
  _ringGeo = new THREE.TorusGeometry(1, 0.09, 8, 32);
  return _ringGeo;
}
