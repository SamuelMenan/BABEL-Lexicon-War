import * as THREE from 'three';
import { Enemy, pickEnemyType } from '../entities/Enemy.js';
import { CombatPlayer } from '../entities/combatPlayer.js';
import { Projectile, PROJECTILE_TYPES } from '../entities/Projectile.js';
import { WordToken } from '../entities/WordToken.js';
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
import { Arena, ARENA_SCENARIO_2 } from '../entities/Arena.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { WORD_POOL_ES, ENEMY_BASE_SPEED, ENEMY_SPEED_SCALE, MAX_ACTIVE_ENEMIES, WAVE_INTERVAL_MS, PLAYER_MAX_HP, HIT_DAMAGE } from '../../shared/constants.js';

const ACTIVE_ARENA_SCENARIO = ARENA_SCENARIO_2;

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

function randomWord(exclude = []) {
  const pool = WORD_POOL_ES.filter(w => !exclude.includes(w));
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickProjectileType() {
  const r = Math.random();
  if (r < 0.25) return PROJECTILE_TYPES.STANDARD;
  if (r < 0.50) return PROJECTILE_TYPES.RAPID;
  if (r < 0.75) return PROJECTILE_TYPES.HEAVY;
  return PROJECTILE_TYPES.BURST;
}

export class SceneManager {
  constructor(scene, lexicon, physics, hudCanvas, cam = null) {
    this.scene = scene; this.lexicon = lexicon; this.physics = physics;
    this.hudCanvas = hudCanvas; this._cam = cam;
    this.enemies = []; this.tokens = []; this.projectiles = [];
    this.wave = 0; this.hp = PLAYER_MAX_HP; this._waveTimer = 0;
    this._unsubs = []; this._player = null; this._particles = null;
    this._arena = new Arena(scene);
  }

  init() {
    this._arena.build(ACTIVE_ARENA_SCENARIO);
    this._buildPlayer();
    this._particles = new ParticleEmitter(this.scene);
    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED,  (pp) => this._onWordCompleted(pp)),
      EventBus.on(EventTypes.ENEMY_REACHED,   (pp) => this._onEnemyReached(pp)),
      EventBus.on(EventTypes.WORD_PROGRESS,   (pp) => this._onWordProgress(pp)),
    );
  }

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._particles?.dispose();
    this._arena.dispose();
  }

  update(delta) {
    this.physics.update(delta);
    this.hudCanvas.update(delta);
    this._particles.update(delta);
    this._player?.update(delta);
    this._arena.update(delta);
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
    this._player = new CombatPlayer();
    this._player.addToScene(this.scene);
  }

  _startWave() {
    this.wave++;
    const count = Math.min(this.wave + 1, MAX_ACTIVE_ENEMIES);
    const speed = ENEMY_BASE_SPEED + (this.wave - 1) * ENEMY_SPEED_SCALE;
    EventBus.emit(EventTypes.WAVE_START, { waveNumber: this.wave });
    Bridge.setState({ wave: this.wave });
    for (let i = 0; i < count; i++) setTimeout(() => this._spawnEnemy(speed), i * 450);
  }

  _spawnEnemy(speed) {
    const activeWords = this.enemies.filter(e => e.active).map(e => e.word);
    const word = randomWord(activeWords), pos = randomSpawnPosition();
    const type = pickEnemyType(word, this.wave);
    const enemy = new Enemy(word, pos, speed, type), token = new WordToken(enemy);
    enemy.addToScene(this.scene);
    this.enemies.push(enemy);
    this.tokens.push(token);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));
    EventBus.emit(EventTypes.ENEMY_SPAWNED, { id: enemy.id, word, position: pos });
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
    if (correct) {
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
    this._player?.clearTarget();
    EventBus.emit(EventTypes.ENEMY_COLLAPSED, { id: enemyId, word: enemy.word });
  }

  _onEnemyReached({ id }) {
    const enemy = this.enemies.find(e => e.id === id);
    if (!enemy || !enemy.active) return;
    this._particles.burst(enemy.position.clone());
    enemy.active = false; enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));
    if (id === this.lexicon.currentTargetId) {
      this.lexicon.clearTarget(); this._player?.clearTarget();
    }
    this._player?.takeHit?.();
    this.hp = Math.max(0, this.hp - HIT_DAMAGE);
    Bridge.setState({ hp: this.hp });
    EventBus.emit(EventTypes.PLAYER_HIT, { damage: HIT_DAMAGE });
    if (this.hp <= 0) {
      EventBus.emit(EventTypes.PLAYER_DIED);
      EventBus.emit(EventTypes.GAME_OVER, { score: this.wave, wpm: Bridge.getState().wpm, accuracy: Bridge.getState().accuracy });
    }
  }

  _pruneDeadEnemies() {
    if (this.enemies.length     > 200) this.enemies     = this.enemies.filter(e => e.active);
    if (this.tokens.length      > 200) this.tokens      = this.tokens.filter(t => t.enemy.active);
    if (this.projectiles.length > 100) this.projectiles = this.projectiles.filter(pp => pp.active);
  }
}
