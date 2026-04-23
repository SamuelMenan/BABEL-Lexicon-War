import * as THREE from 'three';
import { CombatEnemy, TYPE_META, ENEMY_TYPES } from '../entities/CombatEnemy.js';
import { CombatPlayerShip } from '../entities/CombatPlayerShip.js';
import { Projectile, PROJECTILE_TYPES } from '../entities/Projectile.js';
import { WordToken } from '../entities/WordToken.js';
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
import { Arena, ARENA_SCENARIO_2 } from '../entities/Arena.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { WORD_POOL_ES, WORD_POOL_SHORT, WORD_POOL_MEDIUM, WORD_POOL_LONG, ENEMY_BASE_SPEED, ENEMY_SPEED_SCALE, MAX_ACTIVE_ENEMIES, WAVE_INTERVAL_MS, HIT_DAMAGE, LEX_HEAT_ON_MISTAKE, LEX_HEAT_ON_HIT, PLAYER_MAX_HP, LEX_HEAT_MAX, WARN_PROXIMITY_YELLOW_M, WARN_PROXIMITY_RED_M, SPAWN_BUDGET_BASE, SPAWN_BUDGET_WAVE_FACTOR, SPAWN_BUDGET_SKILL_FACTOR, SPAWN_BUDGET_DANGER_FACTOR, SPAWN_MIN_BUDGET, SPAWN_MAX_BUDGET, SPAWN_COMPOSITION_JITTER, SPAWN_REPEAT_PENALTY, SPAWN_RARE_PITY_STEP, SPAWN_RARE_PITY_MAX, SPAWN_MIN_WEIGHT_SCOUT, SPAWN_MIN_WEIGHT_SENTINEL, SPAWN_MIN_WEIGHT_GUARDIAN, SPAWN_MIN_WEIGHT_PHANTOM, SPAWN_MIN_WEIGHT_APEX, SPAWN_MAX_WEIGHT_APEX, SPAWN_RARE_PITY_THRESHOLD } from '../../shared/constants.js';

const ACTIVE_ARENA_SCENARIO = ARENA_SCENARIO_2;
const PREPARE_MS = 600;
const STEP_MS = 700;
const ENGAGE_MS = 450;

const PRECOMBAT_STEPS = {
  PREPARE: 'prepare',
  FIVE: '5',
  FOUR: '4',
  THREE: '3',
  TWO: '2',
  ONE: '1',
  ENGAGE: 'engage',
};

const PRECOMBAT_MESSAGES = {
  [PRECOMBAT_STEPS.PREPARE]: 'PROTOCOLO PRE-COMBATE INICIALIZADO',
  [PRECOMBAT_STEPS.FIVE]: 'ALINEANDO NODO DE INTERCEPCION',
  [PRECOMBAT_STEPS.FOUR]: 'ESTABILIZANDO RUTA DE IMPACTO',
  [PRECOMBAT_STEPS.THREE]: 'SINCRONIZANDO CANAL LEXICO',
  [PRECOMBAT_STEPS.TWO]: 'FIJANDO FRECUENCIA DE OBJETIVO',
  [PRECOMBAT_STEPS.ONE]: 'ENTRADA AL ENJAMBRE INMINENTE',
  [PRECOMBAT_STEPS.ENGAGE]: 'ERROR DE SINTAXIS. COINCIDENCIA FALLIDA.',
};

function randomSpawnPosition() {
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
function randomWord(wave, exclude = []) {
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

function pickProjectileType() {
  const r = Math.random();
  if (r < 0.25) return PROJECTILE_TYPES.STANDARD;
  if (r < 0.50) return PROJECTILE_TYPES.RAPID;
  if (r < 0.75) return PROJECTILE_TYPES.HEAVY;
  return PROJECTILE_TYPES.BURST;
}

export class CombatSceneManager {
  constructor(scene, lexicon, physics, hudCanvas, cam = null) {
    this.scene = scene; this.lexicon = lexicon; this.physics = physics;
    this.hudCanvas = hudCanvas; this._cam = cam;
    this.enemies = []; this.tokens = []; this.projectiles = [];
    this.wave = 0; this._waveTimer = 0;
    this._unsubs = []; this._player = null; this._particles = null;
    this._arena = new Arena(scene);
    this._resources = new ProgressionSystem();
    // Spawn Director state
    this._pityCounters       = { scout: 0, sentinel: 0, guardian: 0, phantom: 0, apex: 0 };
    this._lastSpawnType      = null;
    this._consecutiveCount   = 0;
    this._apexSpawnedThisWave = 0;
    this._recentWords  = [];   // rolling anti-repeat window
    this._pubThrottle  = 0;    // ms accumulator for distance refresh
    this._prevWarningGlobal = 'none';
    this._deathSequenceStarted = false;
    this._gameOverDelayTimer = null;
    this._deathBurstTimers = [];
    this._preCombatActive = false;
    this._preCombatTimers = [];
    this._spawnTimers = [];
  }

  init() {
    this._deathSequenceStarted = false;
    this._resetPreCombatUIState();
    this._resources.reset();
    this._arena.build(ACTIVE_ARENA_SCENARIO);
    this._buildPlayer();
    this._particles = new ParticleEmitter(this.scene);
    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED,  (pp) => this._onWordCompleted(pp)),
      EventBus.on(EventTypes.ENEMY_REACHED,   (pp) => this._onEnemyReached(pp)),
      EventBus.on(EventTypes.WORD_PROGRESS,   (pp) => this._onWordProgress(pp)),
      EventBus.on(EventTypes.DEBUG_FORCE_PLAYER_DEATH, () => this._onForcePlayerDeath()),
    );
  }

  destroy() {
    if (this._gameOverDelayTimer) {
      clearTimeout(this._gameOverDelayTimer);
      this._gameOverDelayTimer = null;
    }

    this._clearDeathBurstTimers();
    this._clearPreCombatTimers();
    this._clearSpawnTimers();
    this._preCombatActive = false;
    this._resetPreCombatUIState();

    this.projectiles.forEach((p) => p?.removeFromScene?.(this.scene));
    this.projectiles = [];

    this.enemies.forEach((e) => {
      if (!e) return;
      e.active = false;
      e.setTargeted?.(false);
      e.removeFromScene?.(this.scene);
    });
    this.enemies = [];
    this.tokens = [];

    if (this._player) {
      this._player.dispose?.(this.scene);
      this._player.removeFromScene?.(this.scene);
      this._player = null;
    }

    this.hudCanvas?.setTokens?.([]);
    this.hudCanvas?.setOccluders?.([]);
    this.lexicon?.clearTarget?.();

    this._publishEnemies();
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];

    this._particles?.dispose();
    this._particles = null;
    this._arena.dispose();

    this._deathSequenceStarted = false;
    this._prevWarningGlobal = 'none';
  }

  update(delta) {
    if (this._deathSequenceStarted) {
      this._particles.update(delta);
      this._player?.update(delta);
      return;
    }

    if (this._preCombatActive) {
      this.hudCanvas.update(delta);
      this._particles.update(delta);
      this._player?.update(delta);
      this._arena.update(delta);
      return;
    }

    this.physics.update(delta);
    this.hudCanvas.update(delta);
    this._particles.update(delta);
    this._player?.update(delta);
    this._arena.update(delta);
    this._resources.update(delta);
    // Refresh enemy distances ~11x/sec for fluid HUD display
    this._pubThrottle += delta * 1000;
    if (this._pubThrottle >= 90) { this._pubThrottle = 0; this._publishEnemies(); }
    this._updateProjectiles(delta);
    this._autoTarget();
    this._pruneDeadEnemies();
    this._waveTimer += delta * 1000;
    if (this._waveTimer >= WAVE_INTERVAL_MS && this.enemies.filter(e => e.active).length === 0) {
      this._waveTimer = 0;
      this._startWave();
    }
  }

  _buildPlayer() {
    this._player = new CombatPlayerShip();
    this._player.addToScene(this.scene);
    this.hudCanvas?.setOccluders?.([{ object: this._player.mesh, radiusPx: 180 }]);
  }

  _startWave() {
    this.wave++;
    const speed = ENEMY_BASE_SPEED + (this.wave - 1) * ENEMY_SPEED_SCALE;
    EventBus.emit(EventTypes.WAVE_START, { waveNumber: this.wave });
    Bridge.setState({ wave: this.wave });
    this._apexSpawnedThisWave = 0;

    const factors     = this._computePlayerFactors();
    const budget      = this._computeSpawnBudget(factors, this.wave);
    const weights     = this._computeDynamicWeights(factors, this.wave);
    const adjusted    = this._applyAntiRng(weights);
    const composition = this._buildWaveComposition(adjusted, budget);
    this._spawnComposition(composition, speed);
  }

  _publishEnemies() {
    const active = this.enemies.filter(e => e.active);
    const minDist = active.length > 0
      ? Math.min(...active.map(e => e.distanceToPlayer))
      : Infinity;

    const previousWarnings = Bridge.getState().warnings ?? {};
    const proximityLevel = this._deriveProximityLevel(minDist);
    const lowHpLevel = previousWarnings.lowHpLevel ?? 'none';
    const globalLevel = this._deriveGlobalWarningLevel(proximityLevel, lowHpLevel);

    const warnings = {
      ...previousWarnings,
      proximityLevel,
      closestEnemyDistance: Number.isFinite(minDist) ? Math.round(minDist) : null,
      lowHpLevel,
      lowHp: lowHpLevel !== 'none',
      globalLevel,
    };

    Bridge.setState({
      combatEnemies: active.map(e => ({
        id: e.id, word: e.word,
        distance: Math.round(e.distanceToPlayer),
        targeted: e.id === this.lexicon.currentTargetId,
      })),
      swarmRemnants: active.length,
      warnings,
    });

    if (this._prevWarningGlobal !== globalLevel) {
      this._prevWarningGlobal = globalLevel;
      EventBus.emit(EventTypes.WARNING_CHANGED, {
        source: 'combat',
        warnings,
      });
    }
  }

  _deriveProximityLevel(distance) {
    if (!Number.isFinite(distance)) return 'none';
    if (distance <= WARN_PROXIMITY_RED_M) return 'red';
    if (distance <= WARN_PROXIMITY_YELLOW_M) return 'yellow';
    return 'none';
  }

  _deriveGlobalWarningLevel(proximityLevel, lowHpLevel) {
    if (proximityLevel === 'red' || lowHpLevel === 'red') return 'red';
    if (proximityLevel === 'yellow' || lowHpLevel === 'yellow') return 'yellow';
    return 'none';
  }

  _spawnEnemyOfType(type, speed) {
    const activeWords = this.enemies.filter(e => e.active).map(e => e.word);
    const exclude = [...new Set([...this._recentWords, ...activeWords])];
    const word = randomWord(this.wave, exclude);
    // Rolling anti-repeat window (last 10 spawned words)
    this._recentWords.push(word);
    if (this._recentWords.length > 10) this._recentWords.shift();
    const pos  = randomSpawnPosition();
    const enemy = new CombatEnemy(word, pos, speed, type);
    const token = new WordToken(enemy);
    enemy.addToScene(this.scene);
    this.enemies.push(enemy);
    this.tokens.push(token);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));
    EventBus.emit(EventTypes.ENEMY_SPAWNED, { id: enemy.id, word, position: pos });
    this._publishEnemies();
  }

  _fireAt(enemy) {
    if (!this._player || !enemy?.active) return;
    const proj = new Projectile(this._player.muzzlePosition, enemy, () => enemy.hitFlash?.(), pickProjectileType());
    proj.addToScene(this.scene);
    this.projectiles.push(proj);
    this._player.fireAnim();
  }

  _updateProjectiles(delta) {
    const alive = [];
    for (const pp of this.projectiles) {
      if (pp.active) { pp.update(delta); alive.push(pp); }
      else pp.removeFromScene(this.scene);
    }
    this.projectiles = alive;
  }

  _autoTarget() {
    if (this.lexicon.currentTargetId) return;
    const active = this.enemies.filter(e => e.active);
    if (!active.length) return;
    active.sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);
    const target = active[0];
    target.setTargeted(true);
    this.lexicon.setTarget(target.id, target.word);
    this._player?.setTarget(target.position);
    this._cam?.trackX(target.position.x);
  }

  _onWordProgress({ typed, correct }) {
    const targetId = this.lexicon.currentTargetId;
    if (!targetId) return;
    const token = this.tokens.find(t => t.enemy.id === targetId);
    token?.update(typed !== undefined ? typed : '');
    if (correct === false) {
      this._resources.addLexHeat(LEX_HEAT_ON_MISTAKE);
    } else if (correct) {
      const enemy = this.enemies.find(e => e.id === targetId);
      if (enemy) this._fireAt(enemy);
    }
  }

  _onWordCompleted({ enemyId }) {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy) return;
    this._particles.burst(enemy.position.clone());
    enemy.active = false; enemy.setTargeted(false); enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));
    this._publishEnemies();
    this._player?.clearTarget();
    EventBus.emit(EventTypes.ENEMY_COLLAPSED, { id: enemyId, word: enemy.word });
  }

  _onEnemyReached({ id }) {
    if (this._deathSequenceStarted) return;
    const enemy = this.enemies.find(e => e.id === id);
    if (!enemy || !enemy.active) return;
    this._particles.burst(enemy.position.clone());
    enemy.active = false; enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));
    this._publishEnemies();
    if (id === this.lexicon.currentTargetId) {
      this.lexicon.clearTarget(); this._player?.clearTarget();
    }
    this._player?.takeHit?.();

    this._resources.applyDamage(HIT_DAMAGE);
    this._resources.addLexHeat(LEX_HEAT_ON_HIT);

    EventBus.emit(EventTypes.PLAYER_HIT, { damage: HIT_DAMAGE });
    if (this._resources.isDead) {
      this._startPlayerDeathSequence();
    }
  }

  _onForcePlayerDeath() {
    if (this._deathSequenceStarted) return;
    this._startPlayerDeathSequence();
  }

  _startPlayerDeathSequence() {
    this._stopPreCombatCountdown();
    this._deathSequenceStarted = true;
    this._cam?.trackX(0);
    this.enemies.forEach((e) => {
      if (!e?.active) return;
      e.active = false;
      e.setTargeted?.(false);
      e.removeFromScene(this.scene);
    });
    this.hudCanvas.setTokens([]);
    this.lexicon.clearTarget();
    this.projectiles.forEach((p) => p.removeFromScene(this.scene));
    this.projectiles = [];
    this._publishEnemies();
    EventBus.emit(EventTypes.PLAYER_DIED);

    const colPos = this._player?.position.clone();
    if (colPos) {
      this._emitDeathLetterBursts(colPos);
      this._particles.burst(colPos.clone());
      this._particles.burst(colPos.clone());
    }

    this._player?.startCollapse(this.scene, () => {
      this._gameOverDelayTimer = setTimeout(() => {
        this._gameOverDelayTimer = null;
        EventBus.emit(EventTypes.GAME_OVER, {
          score:    this.wave,
          wpm:      Bridge.getState().wpm,
          accuracy: Bridge.getState().accuracy,
        });
      }, 600);
    });
  }

  _emitDeathLetterBursts(origin) {
    this._clearDeathBurstTimers();
    const offsets = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.45, 0.22, -0.12),
      new THREE.Vector3(0.52, -0.08, 0.16),
      new THREE.Vector3(0.0, 0.36, -0.24),
      new THREE.Vector3(-0.22, -0.28, 0.1),
    ];
    const scheduleMs = [0, 140, 280, 420, 560];

    scheduleMs.forEach((ms, idx) => {
      const timer = setTimeout(() => {
        this._deathBurstTimers = this._deathBurstTimers.filter((t) => t !== timer);
        const pos = origin.clone().add(offsets[idx]);
        this._particles.burstCollapse(pos);
      }, ms);
      this._deathBurstTimers.push(timer);
    });
  }

  _clearDeathBurstTimers() {
    if (this._deathBurstTimers.length === 0) return;
    this._deathBurstTimers.forEach((timer) => clearTimeout(timer));
    this._deathBurstTimers = [];
  }

  startCombatWithCountdown() {
    if (this._deathSequenceStarted) return;
    this._stopPreCombatCountdown();
    this._preCombatActive = true;

    EventBus.emit(EventTypes.COMBAT_COUNTDOWN_START, { step: PRECOMBAT_STEPS.PREPARE });
    Bridge.setState({
      preCombatActive: true,
      preCombatStep: PRECOMBAT_STEPS.PREPARE,
      preCombatValue: null,
      preCombatMessage: PRECOMBAT_MESSAGES[PRECOMBAT_STEPS.PREPARE],
      preCombatLevel: 'yellow',
    });

    this._schedulePreCombat(PREPARE_MS, () => {
      this._setPreCombatStep(PRECOMBAT_STEPS.FIVE, '5', 'yellow');
    });

    this._schedulePreCombat(PREPARE_MS + STEP_MS, () => {
      this._setPreCombatStep(PRECOMBAT_STEPS.FOUR, '4', 'yellow');
    });

    this._schedulePreCombat(PREPARE_MS + STEP_MS * 2, () => {
      this._setPreCombatStep(PRECOMBAT_STEPS.THREE, '3', 'yellow');
    });

    this._schedulePreCombat(PREPARE_MS + STEP_MS * 3, () => {
      this._setPreCombatStep(PRECOMBAT_STEPS.TWO, '2', 'yellow');
    });

    this._schedulePreCombat(PREPARE_MS + STEP_MS * 4, () => {
      this._setPreCombatStep(PRECOMBAT_STEPS.ONE, '1', 'red');
    });

    this._schedulePreCombat(PREPARE_MS + STEP_MS * 5, () => {
      this._setPreCombatStep(PRECOMBAT_STEPS.ENGAGE, 'ENGAGE', 'red');
    });

    this._schedulePreCombat(PREPARE_MS + STEP_MS * 5 + ENGAGE_MS, () => {
      this._preCombatActive = false;
      this._clearPreCombatTimers();
      this._resetPreCombatUIState();
      EventBus.emit(EventTypes.COMBAT_COUNTDOWN_END, { step: PRECOMBAT_STEPS.ENGAGE });
      this._startWave();
    });
  }

  _schedulePreCombat(ms, cb) {
    const timer = setTimeout(() => {
      this._preCombatTimers = this._preCombatTimers.filter((t) => t !== timer);
      if (!this._preCombatActive || this._deathSequenceStarted) return;
      cb();
    }, ms);
    this._preCombatTimers.push(timer);
  }

  _setPreCombatStep(step, value, level) {
    EventBus.emit(EventTypes.COMBAT_COUNTDOWN_TICK, { step, value, level });
    Bridge.setState({
      preCombatActive: true,
      preCombatStep: step,
      preCombatValue: value,
      preCombatMessage: PRECOMBAT_MESSAGES[step],
      preCombatLevel: level,
    });
  }

  _clearPreCombatTimers() {
    if (this._preCombatTimers.length === 0) return;
    this._preCombatTimers.forEach((timer) => clearTimeout(timer));
    this._preCombatTimers = [];
  }

  _clearSpawnTimers() {
    if (this._spawnTimers.length === 0) return;
    this._spawnTimers.forEach((timer) => clearTimeout(timer));
    this._spawnTimers = [];
  }

  _stopPreCombatCountdown() {
    this._clearPreCombatTimers();
    this._preCombatActive = false;
    this._resetPreCombatUIState();
  }

  _resetPreCombatUIState() {
    Bridge.setState({
      preCombatActive: false,
      preCombatStep: null,
      preCombatValue: null,
      preCombatMessage: '',
      preCombatLevel: 'yellow',
    });
  }


  // ─── Spawn Director ────────────────────────────────────────────────────────

  _computePlayerFactors() {
    const state      = Bridge.getState();
    const snap       = this._resources.getSnapshot();
    const wpm        = state.wpm        ?? 0;
    const accuracy   = state.accuracy   ?? 100;
    const hullPct    = snap.hull        / PLAYER_MAX_HP;
    const lexHeatPct = snap.lexHeat     / LEX_HEAT_MAX;

    const wpmNorm       = Math.min(1, wpm / 75);
    const accNorm       = Math.min(1, accuracy / 100);
    const stabilityNorm = hullPct;
    const skillFactor   = Math.min(1, Math.max(0,
      0.45 * wpmNorm + 0.35 * accNorm + 0.20 * stabilityNorm));

    const dangerFactor = Math.min(1, Math.max(0,
      0.55 * (1 - hullPct) + 0.45 * lexHeatPct));

    return { skillFactor, dangerFactor, hullPct, lexHeatPct,
             isOverheated: snap.isOverheated };
  }

  _computeSpawnBudget({ skillFactor, dangerFactor, isOverheated }, wave) {
    let budget = SPAWN_BUDGET_BASE
      + wave        * SPAWN_BUDGET_WAVE_FACTOR
      + skillFactor * SPAWN_BUDGET_SKILL_FACTOR
      - dangerFactor * SPAWN_BUDGET_DANGER_FACTOR;

    if (isOverheated) budget *= 0.80; // mercy cut: don't pile on during overheat

    return Math.min(SPAWN_MAX_BUDGET, Math.max(SPAWN_MIN_BUDGET, budget));
  }

  _computeDynamicWeights({ skillFactor, dangerFactor, lexHeatPct, isOverheated }, wave) {
    const w = {};
    for (const [t, meta] of Object.entries(TYPE_META)) {
      let wt = meta.rarityWeight;

      // threat penalty: rarer naturally for dangerous types
      wt *= (1.0 - meta.threatBase * 0.45);

      // wave curve: scale up mid/high types over time
      if (wave >= 4 && (t === 'sentinel' || t === 'guardian' || t === 'phantom')) {
        wt *= 1.0 + (wave - 3) * 0.05;
      }
      if (wave >= 7 && t === 'apex') {
        wt *= 1.0 + (wave - 6) * 0.04;
      }

      // danger high: ease off slow tanks, keep fast manageable targets
      if (dangerFactor > 0.60) {
        if (t === 'guardian') wt *= 0.60;
        if (t === 'scout')    wt *= 1.20;
      }

      // skill high: enrich with high-pressure types
      if (skillFactor > 0.65) {
        if (t === 'phantom' || t === 'sentinel') wt *= 1.0 + skillFactor * 0.25;
      }

      // overheat: prefer lex-pressure types, avoid burst-damage apex
      if (isOverheated) {
        if (meta.lexHeatImpact > 0.5) wt *= 1.15;
        if (t === 'apex')              wt *= 0.70;
      }

      w[t] = Math.max(0, wt);
    }
    return w;
  }

  _applyAntiRng(weights) {
    const w = { ...weights };
    const rareTypes = ['guardian', 'phantom', 'apex'];

    // Pity boost for types that haven't appeared recently
    for (const t of rareTypes) {
      const boost = Math.min(SPAWN_RARE_PITY_MAX,
        this._pityCounters[t] * SPAWN_RARE_PITY_STEP);
      w[t] = (w[t] ?? 0) + boost;
    }

    // Repeat penalty: reduce weight of last type if spamming
    if (this._lastSpawnType && this._consecutiveCount >= 2) {
      w[this._lastSpawnType] *= SPAWN_REPEAT_PENALTY;
    }

    // Apex hard cap per wave: 0 early, 1 mid, 2 late
    const apexLimit = this.wave < 5 ? 0 : this.wave < 8 ? 1 : 2;
    if (this._apexSpawnedThisWave >= apexLimit) {
      w.apex = Math.min(w.apex ?? 0, SPAWN_MIN_WEIGHT_APEX * 0.3);
    }

    // Floor weights (all types must have some presence)
    const floors = {
      scout: SPAWN_MIN_WEIGHT_SCOUT, sentinel: SPAWN_MIN_WEIGHT_SENTINEL,
      guardian: SPAWN_MIN_WEIGHT_GUARDIAN, phantom: SPAWN_MIN_WEIGHT_PHANTOM,
      apex: SPAWN_MIN_WEIGHT_APEX,
    };
    for (const t of Object.keys(w)) {
      w[t] = Math.max(floors[t] ?? 0.05, w[t]);
    }

    // Apex ceiling
    w.apex = Math.min(SPAWN_MAX_WEIGHT_APEX, w.apex);

    return w;
  }

  _sampleWeighted(weights) {
    const types = Object.keys(weights);
    const total = types.reduce((acc, t) => acc + weights[t], 0);
    let r = Math.random() * total;
    for (const t of types) {
      r -= weights[t];
      if (r <= 0) return t;
    }
    return ENEMY_TYPES.SCOUT;
  }

  _buildWaveComposition(weights, budget) {
    const composition = [];
    let remaining = budget;
    const activeSlots = MAX_ACTIVE_ENEMIES - this.enemies.filter(e => e.active).length;
    const MIN_COST = 0.38; // below scout's threatBase — stop if we can't fit even scout

    while (remaining > MIN_COST && composition.length < activeSlots) {
      const sampled = this._sampleWeighted(weights);
      const meta    = TYPE_META[sampled];
      const jitter  = (Math.random() - 0.5) * SPAWN_COMPOSITION_JITTER;
      const cost    = meta.threatBase + jitter;

      if (cost <= remaining) {
        composition.push(sampled);
        remaining -= cost;

        // Update consecutive tracking
        if (sampled === this._lastSpawnType) {
          this._consecutiveCount++;
        } else {
          this._lastSpawnType    = sampled;
          this._consecutiveCount = 1;
        }

        // Reset pity for spawned type, increment for others
        for (const t of Object.keys(this._pityCounters)) {
          this._pityCounters[t] = (t === sampled) ? 0 : this._pityCounters[t] + 1;
        }

        if (sampled === 'apex') this._apexSpawnedThisWave++;
      } else {
        // Try cheapest fallback before giving up
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

  _spawnComposition(composition, speed) {
    composition.forEach((type, i) => {
      const timer = setTimeout(() => {
        this._spawnTimers = this._spawnTimers.filter((t) => t !== timer);
        if (this._deathSequenceStarted || this._preCombatActive) return;
        this._spawnEnemyOfType(type, speed);
      }, i * 450);
      this._spawnTimers.push(timer);
    });
  }

  _pruneDeadEnemies() {
    if (this.enemies.length     > 200) this.enemies     = this.enemies.filter(e => e.active);
    if (this.tokens.length      > 200) this.tokens      = this.tokens.filter(t => t.enemy.active);
    if (this.projectiles.length > 100) this.projectiles = this.projectiles.filter(pp => pp.active);
  }
}
