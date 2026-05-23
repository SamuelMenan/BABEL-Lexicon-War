// EconomySystem — único mutador del perfil del jugador.
// Resto del juego solo emite eventos; EconomySystem los escucha,
// muta el perfil, persiste y reemite PROFILE_UPDATED.

import { Bridge } from '../../shared/bridge.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { loadProfile, saveProfile, resetProfile, makeDefaultProfile } from '../../shared/playerProfile.js';
import { getShipCatalogEntry } from '../../shared/shopCatalog.js';

class EconomySystemImpl {
  constructor() {
    this._profile = loadProfile();
    this._unsubs  = [];
    this._mirrorToBridge();
  }

  // ── Lectura ──────────────────────────────────────────────────────────────
  getProfile()      { return { ...this._profile, stats: { ...this._profile.stats } }; }
  getGrafemas()     { return this._profile.grafemas; }
  ownsShip(id)      { return this._profile.ownedShips.includes(id); }
  getEquippedShip() { return this._profile.equippedShip; }
  getSelectedCharacter() { return this._profile.selectedCharacter; }

  setSelectedCharacter(characterId) {
    if (typeof characterId !== 'string') return { ok: false, reason: 'invalid_id' };
    if (this._profile.selectedCharacter === characterId) return { ok: true };
    this._profile.selectedCharacter = characterId;
    this._commit();
    Bridge.emit(EventTypes.CHARACTER_SELECTED, { characterId });
    return { ok: true };
  }

  canAfford(shipId) {
    const entry = getShipCatalogEntry(shipId);
    return this._profile.grafemas >= entry.price;
  }

  // ── Mutación ─────────────────────────────────────────────────────────────
  award(amount, source = 'unknown', breakdown = null) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this._profile.grafemas += amount;
    this._profile.stats.totalGrafemasEarned += amount;
    if (source === 'combat') this._profile.stats.kills += 1;
    if (source === 'race')   this._profile.stats.racesWon += 1;
    this._commit();
    Bridge.emit(EventTypes.GRAFEMAS_AWARDED, { amount, source, breakdown });
  }

  // Compra una nave. Devuelve { ok, reason }.
  purchaseShip(shipId) {
    if (this.ownsShip(shipId)) return { ok: false, reason: 'already_owned' };
    const entry = getShipCatalogEntry(shipId);
    if (!Number.isFinite(entry.price)) return { ok: false, reason: 'not_for_sale' };
    if (this._profile.grafemas < entry.price) return { ok: false, reason: 'insufficient_funds' };
    this._profile.grafemas -= entry.price;
    this._profile.stats.totalGrafemasSpent += entry.price;
    this._profile.ownedShips.push(shipId);
    this._commit();
    Bridge.emit(EventTypes.GRAFEMAS_SPENT, { amount: entry.price, reason: `ship:${shipId}` });
    Bridge.emit(EventTypes.SHIP_PURCHASED, { shipId, price: entry.price });
    return { ok: true };
  }

  equipShip(shipId) {
    if (!this.ownsShip(shipId)) return { ok: false, reason: 'not_owned' };
    if (this._profile.equippedShip === shipId) return { ok: true };
    this._profile.equippedShip = shipId;
    this._commit();
    Bridge.emit(EventTypes.SHIP_EQUIPPED, { shipId });
    return { ok: true };
  }

  reset() {
    this._profile = resetProfile();
    this._commit();
    Bridge.emit(EventTypes.PROFILE_RESET);
  }

  // Setters generales para preferencias persistidas (no monetarias).
  setKeybindOverride(actionId, key) {
    this._profile.keybindOverrides = { ...(this._profile.keybindOverrides || {}), [actionId]: key };
    this._commit();
  }
  clearKeybindOverride(actionId) {
    const next = { ...(this._profile.keybindOverrides || {}) };
    delete next[actionId];
    this._profile.keybindOverrides = next;
    this._commit();
  }
  resetKeybindOverrides() {
    this._profile.keybindOverrides = {};
    this._commit();
  }
  setDebugEnabled(enabled) {
    this._profile.debugEnabled = !!enabled;
    this._commit();
  }

  // ── Interno ──────────────────────────────────────────────────────────────
  _commit() {
    saveProfile(this._profile);
    this._mirrorToBridge();
    Bridge.emit(EventTypes.PROFILE_UPDATED, { profile: this.getProfile() });
  }

  _mirrorToBridge() {
    Bridge.setState({
      grafemas:          this._profile.grafemas,
      ownedShips:        [...this._profile.ownedShips],
      equippedShip:      this._profile.equippedShip,
      selectedCharacter: this._profile.selectedCharacter,
    });
  }

  dispose() {
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
  }
}

export const EconomySystem = new EconomySystemImpl();

// Convenience helpers — útiles para tests y debug en consola.
if (typeof window !== 'undefined') {
  window.__economy = EconomySystem;
}
