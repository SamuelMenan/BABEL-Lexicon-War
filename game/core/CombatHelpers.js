import * as THREE from 'three';
import { PROJECTILE_TYPES } from '../entities/Projectile.js';
import { WORD_POOL_ES, WORD_POOL_SHORT, WORD_POOL_MEDIUM, WORD_POOL_LONG } from '../../shared/constants.js';

export function randomSpawnPosition() {
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

// Selects word from tier pool based on wave; exclude = currently active + recent words
export function randomWord(wave, exclude = []) {
  const shortW  = wave <= 3 ? 0.65 : wave <= 7 ? 0.25 : 0.08;
  const mediumW = wave <= 3 ? 0.35 : wave <= 7 ? 0.55 : 0.42;
  const longW   = wave <= 3 ? 0.00 : wave <= 7 ? 0.20 : 0.50;
  const r = Math.random() * (shortW + mediumW + longW);
  const base = r < shortW ? WORD_POOL_SHORT
    : r < shortW + mediumW ? WORD_POOL_MEDIUM
    : WORD_POOL_LONG;
  const avail = base.filter(w => !exclude.includes(w));
  const pool  = avail.length > 0 ? avail : WORD_POOL_ES.filter(w => !exclude.includes(w));
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : WORD_POOL_ES[0];
}

export function pickProjectileType() {
  const r = Math.random();
  if (r < 0.25) return PROJECTILE_TYPES.STANDARD;
  if (r < 0.50) return PROJECTILE_TYPES.RAPID;
  if (r < 0.75) return PROJECTILE_TYPES.HEAVY;
  return PROJECTILE_TYPES.BURST;
}
