// Gestiona la escena de combate: spawn, targeting, colapso, oleadas

import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { WordToken } from '../entities/WordToken.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import {
  WORD_POOL_ES,
  ENEMY_BASE_SPEED,
  ENEMY_SPEED_SCALE,
  MAX_ACTIVE_ENEMIES,
  WAVE_INTERVAL_MS,
  PLAYER_MAX_HP,
  HIT_DAMAGE,
  COLORS,
} from '../../shared/constants.js';

function randomSpawnPosition(radius = 18) {
  const angle = Math.random() * Math.PI * 2;
  const tilt  = (Math.random() - 0.5) * Math.PI * 0.5;
  return new THREE.Vector3(
    Math.cos(angle) * Math.cos(tilt) * radius,
    Math.sin(tilt) * radius * 0.4,
    Math.sin(angle) * Math.cos(tilt) * radius,
  );
}

function randomWord(exclude = []) {
  const pool = WORD_POOL_ES.filter(w => !exclude.includes(w));
  return pool[Math.floor(Math.random() * pool.length)];
}

export class SceneManager {
  constructor(scene, lexicon, physics, hudCanvas) {
    this.scene     = scene;
    this.lexicon   = lexicon;
    this.physics   = physics;
    this.hudCanvas = hudCanvas;

    this.enemies   = [];   // Enemy[]
    this.tokens    = [];   // WordToken[]
    this.wave      = 0;
    this.hp        = PLAYER_MAX_HP;
    this._waveTimer = 0;
    this._unsubs   = [];
  }

  init() {
    this._buildArena();

    this._unsubs.push(
      EventBus.on(EventTypes.GAME_START,      () => this._startWave()),
      EventBus.on(EventTypes.WORD_COMPLETED,  (p) => this._onWordCompleted(p)),
      EventBus.on(EventTypes.ENEMY_REACHED,   (p) => this._onEnemyReached(p)),
      EventBus.on(EventTypes.WORD_PROGRESS,   (p) => this._onWordProgress(p)),
    );
  }

  destroy() {
    this._unsubs.forEach(fn => fn());
  }

  update(delta) {
    this.physics.update(delta);
    this.hudCanvas.update(delta);
    this._autoTarget();
    this._pruneDeadEnemies();

    // Oleada siguiente
    this._waveTimer += delta * 1000;
    if (this._waveTimer >= WAVE_INTERVAL_MS && this.enemies.filter(e => e.active).length === 0) {
      this._waveTimer = 0;
      this._startWave();
    }
  }

  // --- Arena ---

  _buildArena() {
    // Estrella de fondo: puntos aleatorios
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x445566, size: 0.15 }),
    );
    this.scene.add(stars);
  }

  // --- Oleadas ---

  _startWave() {
    this.wave++;
    const count = Math.min(this.wave + 1, MAX_ACTIVE_ENEMIES);
    const speed = ENEMY_BASE_SPEED + (this.wave - 1) * ENEMY_SPEED_SCALE;

    EventBus.emit(EventTypes.WAVE_START, { waveNumber: this.wave });
    Bridge.setState({ wave: this.wave });

    for (let i = 0; i < count; i++) {
      this._spawnEnemy(speed);
    }
  }

  _spawnEnemy(speed) {
    const activeWords = this.enemies.filter(e => e.active).map(e => e.word);
    const word  = randomWord(activeWords);
    const pos   = randomSpawnPosition();
    const enemy = new Enemy(word, pos, speed);
    const token = new WordToken(enemy);

    enemy.addToScene(this.scene);
    this.enemies.push(enemy);
    this.tokens.push(token);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));

    EventBus.emit(EventTypes.ENEMY_SPAWNED, { id: enemy.id, word, position: pos });
  }

  // --- Targeting automático ---

  _autoTarget() {
    if (this.lexicon.currentTargetId) return; // ya hay target

    const active = this.enemies.filter(e => e.active);
    if (active.length === 0) return;

    // Target: enemigo más cercano al jugador
    active.sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);
    const target = active[0];
    target.setTargeted(true);
    this.lexicon.setTarget(target.id, target.word);
  }

  // --- Eventos ---

  _onWordCompleted({ enemyId }) {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy) return;

    enemy.active = false;
    enemy.setTargeted(false);
    enemy.removeFromScene(this.scene);

    // Actualizar tokens visibles
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));

    EventBus.emit(EventTypes.ENEMY_COLLAPSED, { id: enemyId, word: enemy.word });
  }

  _onEnemyReached({ id }) {
    const enemy = this.enemies.find(e => e.id === id);
    if (!enemy || !enemy.active) return;

    enemy.active = false;
    enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));

    this.hp = Math.max(0, this.hp - HIT_DAMAGE);
    Bridge.setState({ hp: this.hp });
    EventBus.emit(EventTypes.PLAYER_HIT, { damage: HIT_DAMAGE });

    if (this.hp <= 0) {
      EventBus.emit(EventTypes.PLAYER_DIED);
      EventBus.emit(EventTypes.GAME_OVER, {
        score:    this.wave,
        wpm:      Bridge.getState().wpm,
        accuracy: Bridge.getState().accuracy,
      });
    }

    // Si era el target activo, liberar
    if (id === this.lexicon.currentTargetId) {
      this.lexicon.clearTarget();
    }
  }

  _onWordProgress({ typed }) {
    if (!this.lexicon.currentTargetId) return;
    const token = this.tokens.find(t => t.enemy.id === this.lexicon.currentTargetId);
    token?.update(typed);
  }

  _pruneDeadEnemies() {
    // Limpiar muertos de memoria si la escena crece
    if (this.enemies.length > 200) {
      this.enemies = this.enemies.filter(e => e.active);
      this.tokens  = this.tokens.filter(t => t.enemy.active);
    }
  }
}
