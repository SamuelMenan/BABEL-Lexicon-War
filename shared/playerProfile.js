// Perfil persistente del jugador. Wallet + inventario.
// Persistencia: localStorage. Migraciones por versión.

import { SHIP_CATALOG } from './shopCatalog.js';
import { DEFAULT_CHARACTER_ID, CHARACTERS } from './characterData.js';

const STORAGE_KEY = 'babel.profile.v1';
const DEFAULT_SHIP_ID = 'spaceship';

function makePlayerId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `plr_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `plr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function computeDefaultOwned() {
  const out = [];
  for (const [id, c] of Object.entries(SHIP_CATALOG)) {
    if (c.unlockedByDefault) out.push(id);
  }
  return out;
}

export const GUEST_DISPLAY_NAME = 'Invitado';

export function makeDefaultProfile() {
  const owned = computeDefaultOwned();
  if (!owned.includes(DEFAULT_SHIP_ID)) owned.unshift(DEFAULT_SHIP_ID);
  return {
    version:      1,
    playerId:     makePlayerId(),
    displayName:  GUEST_DISPLAY_NAME,
    isGuest:      true,
    grafemas:     0,
    ownedShips:   owned,
    equippedShip: DEFAULT_SHIP_ID,
    selectedCharacter: DEFAULT_CHARACTER_ID,
    stats: {
      kills:                0,
      racesWon:             0,
      totalGrafemasEarned:  0,
      totalGrafemasSpent:   0,
    },
    tutorialsSeen: {},  // { combat:'v1', racing:'v1', hangar:'v1', typing:'v1' }
    keybindOverrides: {},  // { actionId: keyString } — vacío = defaults de keybindings.js
    debugEnabled: false,   // gate de DEBUG_* actions (F9, F10, etc.)
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
    if (typeof parsed.playerId !== 'string' || !parsed.playerId) parsed.playerId = makePlayerId();
    if (typeof parsed.version !== 'number' || parsed.version < 2) parsed.version = 2;
    if (!parsed.tutorialsSeen || typeof parsed.tutorialsSeen !== 'object') parsed.tutorialsSeen = {};
    if (!parsed.keybindOverrides || typeof parsed.keybindOverrides !== 'object') parsed.keybindOverrides = {};
    if (typeof parsed.debugEnabled !== 'boolean') parsed.debugEnabled = false;
    if (typeof parsed.selectedCharacter !== 'string' || !CHARACTERS[parsed.selectedCharacter]) {
      parsed.selectedCharacter = DEFAULT_CHARACTER_ID;
    }
    if (typeof parsed.isGuest !== 'boolean') parsed.isGuest = true;
    if (typeof parsed.displayName !== 'string' || !parsed.displayName) {
      parsed.displayName = parsed.isGuest ? GUEST_DISPLAY_NAME : 'Pilot';
    }
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
