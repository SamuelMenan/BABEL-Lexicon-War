import { ENEMY_TYPES, TYPE_META } from '../entities/CombatEnemy.js';
import { Bridge } from '../../shared/bridge.js';
import { randomWord, randomSpawnPosition } from '../core/CombatHelpers.js';
import {
  PLAYER_MAX_HP, LEX_HEAT_MAX, MAX_ACTIVE_ENEMIES,
  SPAWN_BUDGET_BASE, SPAWN_BUDGET_WAVE_FACTOR, SPAWN_BUDGET_SKILL_FACTOR, SPAWN_BUDGET_DANGER_FACTOR,
  SPAWN_MIN_BUDGET, SPAWN_MAX_BUDGET, SPAWN_COMPOSITION_JITTER, SPAWN_REPEAT_PENALTY,
  SPAWN_RARE_PITY_STEP, SPAWN_RARE_PITY_MAX, SPAWN_MIN_WEIGHT_SCOUT, SPAWN_MIN_WEIGHT_SENTINEL,
  SPAWN_MIN_WEIGHT_GUARDIAN, SPAWN_MIN_WEIGHT_PHANTOM, SPAWN_MIN_WEIGHT_APEX, SPAWN_MAX_WEIGHT_APEX,
} from '../../shared/constants.js';

export class SpawnDirector {
  // spawnOne: (type, speed, word) => void
  // getActiveWords: () => string[]  — currently visible enemy words
  // getActiveSlots: () => number    — available spawn slots
  // getResources:   () => ProgressionSystem snapshot provider
  // getWave:        () => number
  constructor({ getWave, getActiveWords, getActiveSlots, getResources, spawnOne }) {
    this._getWave        = getWave;
    this._getActiveWords = getActiveWords;
    this._getActiveSlots = getActiveSlots;
    this._getResources   = getResources;
    this._spawnOne       = spawnOne;
    this._pityCounters        = { scout: 0, sentinel: 0, guardian: 0, phantom: 0, apex: 0 };
    this._lastSpawnType       = null;
    this._consecutiveCount    = 0;
    this._apexSpawnedThisWave = 0;
    this._recentWords         = [];
    // Budget de palabras largas (>=9 chars) por oleada — anti-castigo injusto.
    this._longInWaveMax       = 2;
    this._longInWave          = 0;
    this._longCooldownSpawns  = 2;
    this._sinceLastLong       = 999;
    this._waveSpawnPositions  = []; // posiciones de la oleada — evita overlap
    // Staggered spawn queue (frame-based, no setTimeout)
    this._spawnQueue   = []; // [{type, speed}]
    this._spawnAcc     = 0;
    this._spawnIntervalMs = 450;  // ms entre spawns — cadencia original
    this._maxPerTick      = 2;    // hard cap por frame
    this._isBlocked       = () => false;
  }

  // isBlocked: () => bool — checked at each staggered spawn tick
  beginWave(speed, isBlocked) {
    this._apexSpawnedThisWave = 0;
    this._longInWave          = 0;
    this._sinceLastLong       = 999;
    this._waveSpawnPositions.length = 0;
    const wave        = this._getWave();
    const factors     = this._computePlayerFactors();
    const budget      = this._computeSpawnBudget(factors, wave);
    const weights     = this._computeDynamicWeights(factors, wave);
    const adjusted    = this._applyAntiRng(weights, wave);
    const composition = this._buildWaveComposition(adjusted, budget);
    this._enqueueSpawns(composition, speed, isBlocked);
  }

  // CombatSceneManager invoca esto cada frame con delta(s).
  tick(delta) {
    if (this._spawnQueue.length === 0) return;
    this._spawnAcc += delta * 1000;
    let spawned = 0;
    while (
      this._spawnQueue.length > 0 &&
      this._spawnAcc >= this._spawnIntervalMs &&
      spawned < this._maxPerTick
    ) {
      this._spawnAcc -= this._spawnIntervalMs;
      const next = this._spawnQueue.shift();
      if (this._isBlocked()) { this._spawnQueue.length = 0; this._spawnAcc = 0; return; }
      this._spawnOneEntry(next);
      spawned++;
    }
  }

  dispose() {
    this._spawnQueue.length = 0;
    this._spawnAcc = 0;
  }

  // ── Player factors ────────────────────────────────────────────────────────

  _computePlayerFactors() {
    const state      = Bridge.getState();
    const snap       = this._getResources().getSnapshot();
    const wpm        = state.wpm      ?? 0;
    const accuracy   = state.accuracy ?? 100;
    const hullPct    = snap.hull    / PLAYER_MAX_HP;
    const lexHeatPct = snap.lexHeat / LEX_HEAT_MAX;

    const wpmNorm       = Math.min(1, wpm / 75);
    const accNorm       = Math.min(1, accuracy / 100);
    const stabilityNorm = hullPct;
    const skillFactor   = Math.min(1, Math.max(0,
      0.45 * wpmNorm + 0.35 * accNorm + 0.20 * stabilityNorm));
    const dangerFactor  = Math.min(1, Math.max(0,
      0.55 * (1 - hullPct) + 0.45 * lexHeatPct));

    return { skillFactor, dangerFactor, hullPct, lexHeatPct, isOverheated: snap.isOverheated };
  }

  _computeSpawnBudget({ skillFactor, dangerFactor, isOverheated }, wave) {
    let budget = SPAWN_BUDGET_BASE
      + wave         * SPAWN_BUDGET_WAVE_FACTOR
      + skillFactor  * SPAWN_BUDGET_SKILL_FACTOR
      - dangerFactor * SPAWN_BUDGET_DANGER_FACTOR;
    if (isOverheated) budget *= 0.80; // mercy cut: don't pile on during overheat
    return Math.min(SPAWN_MAX_BUDGET, Math.max(SPAWN_MIN_BUDGET, budget));
  }

  // ── Weight computation ────────────────────────────────────────────────────

  _computeDynamicWeights({ skillFactor, dangerFactor, isOverheated }, wave) {
    const w = {};
    for (const [t, meta] of Object.entries(TYPE_META)) {
      let wt = meta.rarityWeight;
      wt *= (1.0 - meta.threatBase * 0.45);
      if (wave >= 4 && (t === 'sentinel' || t === 'guardian' || t === 'phantom'))
        wt *= 1.0 + (wave - 3) * 0.05;
      if (wave >= 7 && t === 'apex')
        wt *= 1.0 + (wave - 6) * 0.04;
      if (dangerFactor > 0.60) {
        if (t === 'guardian') wt *= 0.60;
        if (t === 'scout')    wt *= 1.20;
      }
      if (skillFactor > 0.65 && (t === 'phantom' || t === 'sentinel'))
        wt *= 1.0 + skillFactor * 0.25;
      if (isOverheated) {
        if (meta.lexHeatImpact > 0.5) wt *= 1.15;
        if (t === 'apex')              wt *= 0.70;
      }
      w[t] = Math.max(0, wt);
    }
    return w;
  }

  _applyAntiRng(weights, wave) {
    const w         = { ...weights };
    const rareTypes = ['guardian', 'phantom', 'apex'];

    for (const t of rareTypes) {
      const boost = Math.min(SPAWN_RARE_PITY_MAX, this._pityCounters[t] * SPAWN_RARE_PITY_STEP);
      w[t] = (w[t] ?? 0) + boost;
    }

    if (this._lastSpawnType && this._consecutiveCount >= 2)
      w[this._lastSpawnType] *= SPAWN_REPEAT_PENALTY;

    const apexLimit = wave < 5 ? 0 : wave < 8 ? 1 : 2;
    if (this._apexSpawnedThisWave >= apexLimit)
      w.apex = Math.min(w.apex ?? 0, SPAWN_MIN_WEIGHT_APEX * 0.3);

    const floors = {
      scout: SPAWN_MIN_WEIGHT_SCOUT, sentinel: SPAWN_MIN_WEIGHT_SENTINEL,
      guardian: SPAWN_MIN_WEIGHT_GUARDIAN, phantom: SPAWN_MIN_WEIGHT_PHANTOM,
      apex: SPAWN_MIN_WEIGHT_APEX,
    };
    for (const t of Object.keys(w)) w[t] = Math.max(floors[t] ?? 0.05, w[t]);
    w.apex = Math.min(SPAWN_MAX_WEIGHT_APEX, w.apex);
    return w;
  }

  _sampleWeighted(weights) {
    const types = Object.keys(weights);
    const total = types.reduce((acc, t) => acc + weights[t], 0);
    let r = Math.random() * total;
    for (const t of types) { r -= weights[t]; if (r <= 0) return t; }
    return ENEMY_TYPES.SCOUT;
  }

  // ── Composition ───────────────────────────────────────────────────────────

  _buildWaveComposition(weights, budget) {
    const composition = [];
    let remaining  = budget;
    const slots    = this._getActiveSlots();
    const MIN_COST = 0.38;

    while (remaining > MIN_COST && composition.length < slots) {
      const sampled = this._sampleWeighted(weights);
      const meta    = TYPE_META[sampled];
      const cost    = meta.threatBase + (Math.random() - 0.5) * SPAWN_COMPOSITION_JITTER;

      if (cost <= remaining) {
        composition.push(sampled);
        remaining -= cost;
        if (sampled === this._lastSpawnType) {
          this._consecutiveCount++;
        } else {
          this._lastSpawnType    = sampled;
          this._consecutiveCount = 1;
        }
        for (const t of Object.keys(this._pityCounters))
          this._pityCounters[t] = (t === sampled) ? 0 : this._pityCounters[t] + 1;
        if (sampled === 'apex') this._apexSpawnedThisWave++;
      } else {
        if (remaining >= TYPE_META.scout.threatBase) {
          composition.push(ENEMY_TYPES.SCOUT);
          remaining -= TYPE_META.scout.threatBase;
        } else {
          break;
        }
      }
    }

    if (composition.length === 0) composition.push(ENEMY_TYPES.SCOUT);
    return composition;
  }

  _enqueueSpawns(composition, speed, isBlocked) {
    this._isBlocked = isBlocked;
    for (const type of composition) this._spawnQueue.push({ type, speed });
    // primer spawn casi inmediato
    this._spawnAcc = this._spawnIntervalMs;
  }

  _spawnOneEntry({ type, speed }) {
    const activeWords = this._getActiveWords();
    const exclude     = [...new Set([...this._recentWords, ...activeWords])];
    // Decide tier hint: si ya hay 2 largas o cooldown activo, forzar short/medium.
    const blockLong = this._longInWave >= this._longInWaveMax
                   || this._sinceLastLong < this._longCooldownSpawns;
    const tierHint = blockLong ? (Math.random() < 0.55 ? 'medium' : 'short') : null;
    const word     = randomWord(this._getWave(), exclude, tierHint);
    if (word.length >= 9) { this._longInWave++; this._sinceLastLong = 0; }
    else                  { this._sinceLastLong++; }
    this._recentWords.push(word);
    if (this._recentWords.length > 10) this._recentWords.shift();
    const pos = randomSpawnPosition(this._waveSpawnPositions);
    this._waveSpawnPositions.push(pos.clone());
    // Cap memoria — solo trackear las ultimas 24 posiciones (suficiente para wave size).
    if (this._waveSpawnPositions.length > 24) this._waveSpawnPositions.shift();
    this._spawnOne(type, speed, word, pos);
  }
}
