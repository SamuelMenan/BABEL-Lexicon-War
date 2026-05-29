import * as THREE from 'three';
import {
  WORD_POOL_ES, WORD_POOL_SHORT, WORD_POOL_MEDIUM, WORD_POOL_LONG,
  WORD_POOL_EN, WORD_POOL_SHORT_EN, WORD_POOL_MEDIUM_EN, WORD_POOL_LONG_EN,
} from '@shared/config/constants.js';
import { getLocale } from '@shared/i18n/index.js';

function pools() {
  if (getLocale() === 'en') {
    return { all: WORD_POOL_EN, short: WORD_POOL_SHORT_EN, medium: WORD_POOL_MEDIUM_EN, long: WORD_POOL_LONG_EN };
  }
  return { all: WORD_POOL_ES, short: WORD_POOL_SHORT, medium: WORD_POOL_MEDIUM, long: WORD_POOL_LONG };
}

// Moon vive en (0, 0, -78) con radio aproximado de ~18u. Buffer extra 4u.
const MOON_CENTER  = new THREE.Vector3(0, 0, -78);
const MOON_AVOID_R = 22;
const MIN_SPAWN_SEPARATION = 7; // distancia minima entre 2 spawns de la misma oleada
const MAX_RETRIES = 12;

function _samplePoint() {
  const z = -(62 + Math.random() * 28);
  const zone = Math.random();
  let x, y;
  if (zone < 0.33) {
    x = (Math.random() - 0.5) * 10;
    y = (Math.random() < 0.5 ? 1 : -1) * (24 + Math.random() * 10);
  } else if (zone < 0.66) {
    x = -(20 + Math.random() * 14);
    y = (Math.random() - 0.5) * 22;
  } else {
    x = 20 + Math.random() * 14;
    y = (Math.random() - 0.5) * 22;
  }
  return new THREE.Vector3(x, y, z);
}

// recent: array de Vector3 ya spawned esta oleada. Garantiza separacion minima
// y evita la luna. Si tras MAX_RETRIES no encuentra hueco, devuelve la ultima
// candidata empujada radialmente.
export function randomSpawnPosition(recent = []) {
  let p = null;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const candidate = _samplePoint();
    if (candidate.distanceTo(MOON_CENTER) < MOON_AVOID_R) continue;
    let collision = false;
    for (const r of recent) {
      if (candidate.distanceTo(r) < MIN_SPAWN_SEPARATION) { collision = true; break; }
    }
    if (!collision) return candidate;
    p = candidate;
  }
  // fallback: empuja radialmente fuera del ultimo candidato hacia x-extremo
  if (p) p.x += (p.x >= 0 ? 8 : -8);
  return p ?? _samplePoint();
}

// Selects word from tier pool based on wave; exclude = currently active + recent words.
// tierHint: 'short' | 'medium' | 'long' fuerza tier (override de pesos por oleada).
export function randomWord(wave, exclude = [], tierHint = null) {
  const P = pools();
  let base;
  if (tierHint === 'short')       base = P.short;
  else if (tierHint === 'medium') base = P.medium;
  else if (tierHint === 'long')   base = P.long;
  else {
    const shortW  = wave <= 3 ? 0.65 : wave <= 7 ? 0.35 : 0.20;
    const mediumW = wave <= 3 ? 0.35 : wave <= 7 ? 0.50 : 0.55;
    const longW   = wave <= 3 ? 0.00 : wave <= 7 ? 0.15 : 0.25;
    const r = Math.random() * (shortW + mediumW + longW);
    base = r < shortW ? P.short
      : r < shortW + mediumW ? P.medium
      : P.long;
  }
  const avail = base.filter(w => !exclude.includes(w));
  const pool  = avail.length > 0 ? avail : P.all.filter(w => !exclude.includes(w));
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : P.all[0];
}

