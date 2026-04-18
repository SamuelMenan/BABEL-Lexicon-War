import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { WordToken } from '../entities/WordToken.js';
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
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
} from '../../shared/constants.js';

// Enemigos vienen desde la profundidad del espacio (eje -Z)
function randomSpawnPosition() {
  const x = (Math.random() - 0.5) * 32;
  const y = (Math.random() - 0.5) * 16;
  const z = -(28 + Math.random() * 20);
  return new THREE.Vector3(x, y, z);
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

    this.enemies   = [];
    this.tokens    = [];
    this.wave      = 0;
    this.hp        = PLAYER_MAX_HP;
    this._waveTimer = 0;
    this._unsubs   = [];

    this._player   = null;
    this._particles = null;
  }

  init() {
    this._buildArena();
    this._buildPlayer();
    this._particles = new ParticleEmitter(this.scene);

    this._unsubs.push(
      EventBus.on(EventTypes.GAME_START,     () => this._startWave()),
      EventBus.on(EventTypes.WORD_COMPLETED, (p) => this._onWordCompleted(p)),
      EventBus.on(EventTypes.ENEMY_REACHED,  (p) => this._onEnemyReached(p)),
      EventBus.on(EventTypes.WORD_PROGRESS,  (p) => this._onWordProgress(p)),
    );
  }

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._particles?.dispose();
  }

  update(delta) {
    this.physics.update(delta);
    this.hudCanvas.update(delta);
    this._particles.update(delta);
    this._player?.update(delta);
    this._autoTarget();
    this._pruneDeadEnemies();

    this._waveTimer += delta * 1000;
    const activeCount = this.enemies.filter(e => e.active).length;
    if (this._waveTimer >= WAVE_INTERVAL_MS && activeCount === 0) {
      this._waveTimer = 0;
      this._startWave();
    }
  }

  _buildArena() {
    // Campo de estrellas
    const count = 1200;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 300;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x334455, size: 0.2, sizeAttenuation: true }),
    ));

    // Rejilla de referencia en el plano XZ — da profundidad visual
    const grid = new THREE.GridHelper(80, 20, 0x112233, 0x0a1520);
    grid.position.y = -6;
    this.scene.add(grid);
  }

  _buildPlayer() {
    this._player = new Player();
    this._player.addToScene(this.scene);
  }

  _startWave() {
    this.wave++;
    const count = Math.min(this.wave + 1, MAX_ACTIVE_ENEMIES);
    const speed = ENEMY_BASE_SPEED + (this.wave - 1) * ENEMY_SPEED_SCALE;

    EventBus.emit(EventTypes.WAVE_START, { waveNumber: this.wave });
    Bridge.setState({ wave: this.wave });

    for (let i = 0; i < count; i++) {
      setTimeout(() => this._spawnEnemy(speed), i * 400); // spawn escalonado
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

  _autoTarget() {
    if (this.lexicon.currentTargetId) return;
    const active = this.enemies.filter(e => e.active);
    if (!active.length) return;

    active.sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);
    const target = active[0];
    target.setTargeted(true);
    this.lexicon.setTarget(target.id, target.word);
  }

  _onWordCompleted({ enemyId }) {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy) return;

    // Partículas en posición del enemigo antes de removerlo
    this._particles.burst(enemy.position.clone());

    enemy.active = false;
    enemy.setTargeted(false);
    enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));

    EventBus.emit(EventTypes.ENEMY_COLLAPSED, { id: enemyId, word: enemy.word });
  }

  _onEnemyReached({ id }) {
    const enemy = this.enemies.find(e => e.id === id);
    if (!enemy || !enemy.active) return;

    this._particles.burst(enemy.position.clone());

    enemy.active = false;
    enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));

    this.hp = Math.max(0, this.hp - HIT_DAMAGE);
    Bridge.setState({ hp: this.hp });
    EventBus.emit(EventTypes.PLAYER_HIT, { damage: HIT_DAMAGE });

    if (id === this.lexicon.currentTargetId) this.lexicon.clearTarget();

    if (this.hp <= 0) {
      EventBus.emit(EventTypes.PLAYER_DIED);
      EventBus.emit(EventTypes.GAME_OVER, {
        score:    this.wave,
        wpm:      Bridge.getState().wpm,
        accuracy: Bridge.getState().accuracy,
      });
    }
  }

  _onWordProgress({ typed }) {
    if (!this.lexicon.currentTargetId) return;
    const token = this.tokens.find(t => t.enemy.id === this.lexicon.currentTargetId);
    token?.update(typed);
  }

  _pruneDeadEnemies() {
    if (this.enemies.length > 200) {
      this.enemies = this.enemies.filter(e => e.active);
      this.tokens  = this.tokens.filter(t => t.enemy.active);
    }
  }
}
