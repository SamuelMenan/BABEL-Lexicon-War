// Perfil persistente del jugador. Wallet + inventario.
// Persistencia: localStorage. Migraciones por versión.

import { SHIP_CATALOG } from './shopCatalog.js';

const STORAGE_KEY = 'babel.profile.v1';
const DEFAULT_SHIP_ID = 'spaceship';

function computeDefaultOwned() {
  const out = [];
  for (const [id, c] of Object.entries(SHIP_CATALOG)) {
    if (c.unlockedByDefault) out.push(id);
  }
  return out;
}

export function makeDefaultProfile() {
  const owned = computeDefaultOwned();
  if (!owned.includes(DEFAULT_SHIP_ID)) owned.unshift(DEFAULT_SHIP_ID);
  return {
    version:      1,
    grafemas:     0,
    ownedShips:   owned,
    equippedShip: DEFAULT_SHIP_ID,
    stats: {
      kills:                0,
      racesWon:             0,
      totalGrafemasEarned:  0,
      totalGrafemasSpent:   0,
    },
  };
}

function isValidProfile(p) {
  return p && typeof p === 'object'
    && typeof p.grafemas === 'number'
    && Array.isArray(p.ownedShips)
    && typeof p.equippedShip === 'string'
    && p.stats && typeof p.stats === 'object';
}

export function loadProfile() {
  if (typeof localStorage === 'undefined') return makeDefaultProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultProfile();
    const parsed = JSON.parse(raw);
    if (!isValidProfile(parsed)) return makeDefaultProfile();
    // Merge default-unlocked naves nuevas que no estaban en perfil viejo.
    const defaults = computeDefaultOwned();
    const merged = new Set([...parsed.ownedShips, ...defaults]);
    parsed.ownedShips = Array.from(merged);
    return parsed;
  } catch {
    return makeDefaultProfile();
  }
}

export function saveProfile(profile) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Quota / privacy mode — silenciar; juego funciona en memoria.
  }
}

export function resetProfile() {
  if (typeof localStorage === 'undefined') return makeDefaultProfile();
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
  return makeDefaultProfile();
}
