// Data estática de enemigos — separada de la lógica de la entidad.
// CFGS define geometría, colores, anillos, multiplicadores y habilidad especial por tipo.

import * as THREE from 'three';

export const ENEMY_TYPES = {
  SCOUT:    'scout',    // icosaedro pequeño, cyan, rápido
  SENTINEL: 'sentinel', // octaedro medio, violeta, 3 anillos
  GUARDIAN: 'guardian', // dodecaedro grande, naranja, lento
  PHANTOM:  'phantom',  // tetraedro, teal translúcido, sin anillos
  APEX:     'apex',     // icosaedro grande, dorado, 4 anillos, boss
};

export const CFGS = {
  scout: {
    geo: () => new THREE.IcosahedronGeometry(0.55, 1),
    color: 0xff4466, glowColor: 0xff4466,
    coreR: 0.18, coreScale: 1,
    glowSize: 2.4, glowOp: 0.5,
    rings: [
      { r: 0.85, tube: 0.035, rotX: Math.PI/3,       rotSpeed: [0,1.5,0] },
      { r: 0.85, tube: 0.035, rotZ: Math.PI/2.5,     rotSpeed: [1.2,0,0] },
    ],
    speedMult: 1.25, tumble: [0.7, 1.0], pulseFreq: 2.5, glowFreq: 2.1,
    emissiveInt: 0.8,
    rarityWeight: 0.34, hpTier: 1,
    lexHeatImpact: 0.20, shieldDamageMult: 1.10, hullDamageMult: 0.80,
    special: 'dash', specialCd: 2.8, specialPower: 0.35, threatBase: 0.42,
  },
  sentinel: {
    geo: () => new THREE.OctahedronGeometry(0.72, 0),
    color: 0xaa44ff, glowColor: 0x8822ee,
    coreR: 0.22, coreScale: 1,
    glowSize: 3.2, glowOp: 0.55,
    rings: [
      { r: 1.0,  tube: 0.04, rotX: Math.PI/4,       rotSpeed: [0, 1.1, 0] },
      { r: 1.0,  tube: 0.04, rotZ: Math.PI/2,        rotSpeed: [0.9, 0, 0] },
      { r: 0.65, tube: 0.03, rotX: Math.PI/1.5,      rotSpeed: [0, -1.8, 0] },
    ],
    speedMult: 1.0, tumble: [0.5, 0.75], pulseFreq: 2.0, glowFreq: 1.7,
    emissiveInt: 0.9,
    rarityWeight: 0.24, hpTier: 2,
    lexHeatImpact: 0.55, shieldDamageMult: 1.00, hullDamageMult: 1.00,
    special: 'pulse', specialCd: 3.6, specialPower: 0.50, threatBase: 0.56,
  },
  guardian: {
    geo: () => new THREE.DodecahedronGeometry(0.9, 0),
    color: 0xff8800, glowColor: 0xff6600,
    coreR: 0.28, coreScale: 1,
    glowSize: 4.0, glowOp: 0.6,
    rings: [
      { r: 1.3,  tube: 0.055, rotX: Math.PI/3,      rotSpeed: [0, 0.7, 0] },
      { r: 1.3,  tube: 0.055, rotZ: Math.PI/2.5,    rotSpeed: [0.6, 0, 0] },
      { r: 0.9,  tube: 0.04,  rotX: Math.PI/1.8,    rotSpeed: [0, -1.0, 0] },
    ],
    speedMult: 0.65, tumble: [0.35, 0.55], pulseFreq: 1.6, glowFreq: 1.4,
    emissiveInt: 1.0,
    rarityWeight: 0.18, hpTier: 4,
    lexHeatImpact: 0.30, shieldDamageMult: 0.90, hullDamageMult: 1.35,
    special: 'crush', specialCd: 4.2, specialPower: 0.62, threatBase: 0.63,
  },
  phantom: {
    geo: () => new THREE.TetrahedronGeometry(0.8, 0),
    color: 0x00eedd, glowColor: 0x00ccbb,
    coreR: 0.16, coreScale: 0.85,
    glowSize: 3.8, glowOp: 0.35,
    rings: [],
    speedMult: 1.1, tumble: [1.1, 1.4], pulseFreq: 3.5, glowFreq: 3.0,
    emissiveInt: 0.6, hullOpacity: 0.45,
    rarityWeight: 0.16, hpTier: 2,
    lexHeatImpact: 0.70, shieldDamageMult: 0.95, hullDamageMult: 0.95,
    special: 'phase', specialCd: 3.0, specialPower: 0.58, threatBase: 0.60,
  },
  apex: {
    geo: () => new THREE.IcosahedronGeometry(1.1, 1),
    color: 0xffdd44, glowColor: 0xffaa00,
    coreR: 0.35, coreScale: 1,
    glowSize: 5.5, glowOp: 0.7,
    rings: [
      { r: 1.6,  tube: 0.06,  rotX: Math.PI/3,      rotSpeed: [0, 0.55, 0] },
      { r: 1.6,  tube: 0.06,  rotZ: Math.PI/2.5,    rotSpeed: [0.5, 0, 0] },
      { r: 1.1,  tube: 0.04,  rotX: Math.PI/1.5,    rotSpeed: [0, -0.9, 0] },
      { r: 0.75, tube: 0.03,  rotZ: Math.PI/1.2,    rotSpeed: [-0.7, 0.4, 0] },
    ],
    speedMult: 0.5, tumble: [0.3, 0.4], pulseFreq: 1.2, glowFreq: 1.0,
    emissiveInt: 1.4,
    rarityWeight: 0.08, hpTier: 5,
    lexHeatImpact: 0.85, shieldDamageMult: 1.20, hullDamageMult: 1.45,
    special: 'nova', specialCd: 5.0, specialPower: 0.85, threatBase: 0.82,
  },
};

// Read-only data snapshot for Spawn Director — mirrors CFGS fields used for composition
export const TYPE_META = {
  scout:    { threatBase: 0.42, rarityWeight: 0.34, lexHeatImpact: 0.20 },
  sentinel: { threatBase: 0.56, rarityWeight: 0.24, lexHeatImpact: 0.55 },
  guardian: { threatBase: 0.63, rarityWeight: 0.18, lexHeatImpact: 0.30 },
  phantom:  { threatBase: 0.60, rarityWeight: 0.16, lexHeatImpact: 0.70 },
  apex:     { threatBase: 0.82, rarityWeight: 0.08, lexHeatImpact: 0.85 },
};

// speed range across all types: [0.5, 1.25]
export const SPEED_MULT_MIN   = 0.5;
export const SPEED_MULT_RANGE = 0.75;

export function pickEnemyType(word = '', wave = 1) {
  const w = {};
  for (const [t, c] of Object.entries(CFGS)) w[t] = c.rarityWeight;

  if (wave >= 4) {
    w.sentinel *= 1.30;
    w.guardian *= 1.25;
    w.phantom  *= 1.25;
  }
  if (wave >= 7) {
    w.apex *= 1.50;
  }

  // scout never drops below 12% share
  const MIN_SCOUT_SHARE = 0.12;
  let total = Object.values(w).reduce((s, v) => s + v, 0);
  if (w.scout / total < MIN_SCOUT_SHARE) {
    w.scout = (MIN_SCOUT_SHARE * total) / (1 - MIN_SCOUT_SHARE);
  }

  total = Object.values(w).reduce((s, v) => s + v, 0);
  let r = Math.random() * total;
  for (const [t, v] of Object.entries(w)) {
    r -= v;
    if (r <= 0) return t;
  }
  return ENEMY_TYPES.SCOUT;
}
