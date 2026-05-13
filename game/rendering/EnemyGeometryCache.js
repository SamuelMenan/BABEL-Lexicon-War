// Cache compartido de geometrías para enemigos — evita regenerar EdgesGeometry / TorusGeometry
// en cada spawn (drop de FPS al cambiar oleada).

import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

const PHI = (1 + Math.sqrt(5)) / 2; // golden ratio

// Normaliza puntos a radio máximo r — preserva proporciones del polítopo.
function _normalizeToRadius(points, r) {
  let max = 0;
  for (const p of points) { const l = p.length(); if (l > max) max = l; }
  const k = r / max;
  for (const p of points) p.multiplyScalar(k);
  return points;
}

// Stellation por extrusión piramidal: cada triángulo de baseGeo se reemplaza
// por 3 triángulos con ápice externo. Aproximación de Kepler-Poinsot.
function _stellateGeometry(baseGeo, spikeFactor = 1.6) {
  const inPos = baseGeo.attributes.position.array;
  const triCount = inPos.length / 9;
  const out = [];
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const apex = new THREE.Vector3();
  for (let f = 0; f < triCount; f++) {
    const i = f * 9;
    v0.set(inPos[i+0], inPos[i+1], inPos[i+2]);
    v1.set(inPos[i+3], inPos[i+4], inPos[i+5]);
    v2.set(inPos[i+6], inPos[i+7], inPos[i+8]);
    apex.copy(v0).add(v1).add(v2).divideScalar(3).multiplyScalar(spikeFactor);
    out.push(v0.x,v0.y,v0.z, v1.x,v1.y,v1.z, apex.x,apex.y,apex.z);
    out.push(v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, apex.x,apex.y,apex.z);
    out.push(v2.x,v2.y,v2.z, v0.x,v0.y,v0.z, apex.x,apex.y,apex.z);
  }
  baseGeo.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  geo.computeVertexNormals();
  return geo;
}

const _sharedEdges = {};
// prebuilt=true → factory ya devuelve BufferGeometry de pares (LineSegments-ready).
// Para enemigos sin caras rellenas (tesseract).
export function getSharedEdges(type, factory, prebuilt = false) {
  if (!_sharedEdges[type]) {
    const geo = factory();
    _sharedEdges[type] = prebuilt ? geo : new THREE.EdgesGeometry(geo);
    if (!prebuilt) geo.dispose();
  }
  return _sharedEdges[type];
}

// Tesseract: 16 vértices 4D proyectados como cubo interior + exterior + 8 conectores.
// 32 aristas total. Sin caras rellenas.
export function buildTesseractEdgesGeometry() {
  const cube = [
    [-1,-1,-1],[+1,-1,-1],[-1,+1,-1],[+1,+1,-1],
    [-1,-1,+1],[+1,-1,+1],[-1,+1,+1],[+1,+1,+1],
  ];
  const cubeEdges = [
    [0,1],[2,3],[4,5],[6,7],
    [0,2],[1,3],[4,6],[5,7],
    [0,4],[1,5],[2,6],[3,7],
  ];
  const inner = 0.40, outer = 0.95;
  const pos = [];
  const push = (v, s) => pos.push(v[0]*s, v[1]*s, v[2]*s);
  for (const [a,b] of cubeEdges) { push(cube[a], inner); push(cube[b], inner); }
  for (const [a,b] of cubeEdges) { push(cube[a], outer); push(cube[b], outer); }
  for (let i = 0; i < 8; i++)    { push(cube[i], inner); push(cube[i], outer); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return geo;
}

// Core unitario faceteado para evitar el look de esfera lisa.
export const sharedCore = new THREE.IcosahedronGeometry(1, 1);

const _sharedRings = {};
export function getSharedRing(r, tube) {
  const key = `${r}_${tube}`;
  if (!_sharedRings[key]) {
    _sharedRings[key] = new THREE.TorusGeometry(r, tube, 6, 24);
  }
  return _sharedRings[key];
}

// ── Polítopos uniformes (convexos) via ConvexGeometry ─────────────────────────

// Rhombicuboctahedron — 26 caras (8 triángulos + 18 cuadrados), 24 vértices.
export function buildRhombicuboctaGeometry(r = 0.95) {
  const t = 1 + Math.SQRT2;
  const pts = [];
  const triples = [[1,1,t],[1,t,1],[t,1,1]];
  for (const [a,b,c] of triples) {
    for (const sa of [-1,1]) for (const sb of [-1,1]) for (const sc of [-1,1]) {
      pts.push(new THREE.Vector3(a*sa, b*sb, c*sc));
    }
  }
  return new ConvexGeometry(_normalizeToRadius(pts, r));
}

// Icosidodecahedron — 32 caras (20 tri + 12 pent), 30 vértices. Cristalino.
export function buildIcosidodecaGeometry(r = 0.95) {
  const pts = [];
  // (±φ, 0, 0) y perms cíclicas
  for (const v of [[PHI,0,0],[0,PHI,0],[0,0,PHI]]) {
    for (const s of [-1,1]) pts.push(new THREE.Vector3(v[0]*s, v[1]*s, v[2]*s));
  }
  // (±1/2, ±φ/2, ±φ²/2) y perms cíclicas
  const phi2 = PHI * PHI;
  const triples = [[0.5, PHI/2, phi2/2],[PHI/2, phi2/2, 0.5],[phi2/2, 0.5, PHI/2]];
  for (const [a,b,c] of triples) {
    for (const sa of [-1,1]) for (const sb of [-1,1]) for (const sc of [-1,1]) {
      pts.push(new THREE.Vector3(a*sa, b*sb, c*sc));
    }
  }
  return new ConvexGeometry(_normalizeToRadius(pts, r));
}

// Truncated Octahedron — 14 caras (8 hex + 6 cuad), 24 vértices.
// Vértices = todas las permutaciones de (0, ±1, ±2).
export function buildTruncatedOctaGeometry(r = 0.95) {
  const triples = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const pts = [];
  for (const t of triples) {
    for (const sx of [-1,1]) for (const sy of [-1,1]) for (const sz of [-1,1]) {
      const x = t[0] === 0 ? 0 : t[0]*sx;
      const y = t[1] === 0 ? 0 : t[1]*sy;
      const z = t[2] === 0 ? 0 : t[2]*sz;
      pts.push(new THREE.Vector3(x, y, z));
    }
  }
  // ConvexGeometry tolera duplicados — limpia internamente.
  return new ConvexGeometry(_normalizeToRadius(pts, r));
}

// ── Polítopos de Kepler-Poinsot (no convexos) via stellation ──────────────────

// Small Stellated Dodecahedron — aproximación: dodecaedro con pirámide
// extruida en cada cara pentagonal (3 tris por cara → spike).
export function buildSmallStellatedDodecaGeometry(r = 0.65, spike = 1.85) {
  return _stellateGeometry(new THREE.DodecahedronGeometry(r, 0), spike);
}

// Great Dodecahedron — aproximación: icosaedro stellated (apex moderado).
// Resultado: 20 caras triangulares con picos cruzados, lectura matemática.
export function buildGreatDodecaGeometry(r = 0.78, spike = 1.45) {
  return _stellateGeometry(new THREE.IcosahedronGeometry(r, 0), spike);
}

export function disposeEnemyGeometryCache() {
  for (const k in _sharedEdges) _sharedEdges[k].dispose();
  for (const k in _sharedRings) _sharedRings[k].dispose();
  sharedCore.dispose();
}
