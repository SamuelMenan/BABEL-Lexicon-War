import * as THREE from 'three';
import { CombatEnemy, ENEMY_TYPES } from '../entities/CombatEnemy.js';
import { EnemyPool } from './EnemyPool.js';
import { CombatPlayerShip } from '../entities/CombatPlayerShip.js';
import { Projectile } from '../entities/Projectile.js';
import { LexBeam } from '../entities/LexBeam.js';
import { WordToken } from '../entities/WordToken.js';
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
import { Arena, ARENA_SCENARIO_2 } from '../entities/Arena.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { HudPublisher } from './HudPublisher.js';
import { SpawnDirector } from '../systems/SpawnDirector.js';
import { PreCombatController } from '../systems/PreCombatController.js';
import { PlayerDeathHandler } from '../systems/PlayerDeathHandler.js';
import { waveTrace } from '../debug/WaveTrace.js';
import {
  ENEMY_BASE_SPEED, ENEMY_SPEED_SCALE, MAX_ACTIVE_ENEMIES,
  WAVE_INTERVAL_MS, HIT_DAMAGE, LEX_HEAT_ON_MISTAKE, LEX_HEAT_ON_HIT,
} from '../../shared/constants.js';

const ACTIVE_ARENA_SCENARIO = ARENA_SCENARIO_2;

export class CombatSceneManager {
  constructor(scene, lexicon, physics, hudCanvas, cam = null) {
    this.scene = scene; this.lexicon = lexicon; this.physics = physics;
    this.hudCanvas = hudCanvas; this._cam = cam;
    this.enemies = []; this.tokens = []; this.projectiles = [];
    this.wave = 0; this._waveTimer = 0;
    this._unsubs = []; this._player = null; this._particles = null;
    this._arena     = new Arena(scene);
    this._resources = new ProgressionSystem();
    this._pool      = new EnemyPool(scene, { size: 500 });

    this._hud = new HudPublisher();

    this._spawn = new SpawnDirector({
      getWave:          () => this.wave,
      getActiveWords:   () => this.enemies.filter(e => e.active).map(e => e.word),
      getActiveSlots:   () => MAX_ACTIVE_ENEMIES - this.enemies.filter(e => e.active).length,
      getResources:     () => this._resources,
      spawnOne:         (type, speed, word, pos) => this._spawnOne(type, speed, word, pos),
    });

    this._preCombat = new PreCombatController({
      onEngaged: () => this._startWave(),
    });

    this._death = new PlayerDeathHandler({
      getParticles:     () => this._particles,
      getPlayer:        () => this._player,
      getLexicon:       () => this.lexicon,
      getProjectiles:   () => this.projectiles,
      clearProjectiles: () => { this.projectiles = []; },
      getEnemies:       () => this.enemies,
      hudCanvas:        this.hudCanvas,
      cam:              this._cam,
      scene:            this.scene,
      getWave:          () => this.wave,
      onPublish:        () => this._hud.publish(this.enemies, this.lexicon.currentTargetId),
    });
  }

  init() {
    this._death.dispose();
    this._preCombat.stop();
    this._resources.reset();
    this._arena.build(ACTIVE_ARENA_SCENARIO);
    this._buildPlayer();
    this._particles = new ParticleEmitter(this.scene);
    // Pre-instancia enemigos progresivamente — evita lag spike en primera oleada.
    if (this._pool.size === 0) {
      this._pool.prewarmProgressive(500, 10);
    }
    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED,            (pp) => this._onWordCompleted(pp)),
      EventBus.on(EventTypes.ENEMY_REACHED,             (pp) => this._onEnemyReached(pp)),
      EventBus.on(EventTypes.WORD_PROGRESS,             (pp) => this._onWordProgress(pp)),
      EventBus.on(EventTypes.DEBUG_FORCE_PLAYER_DEATH,  ()   => this._onForcePlayerDeath()),
    );
  }

  destroy() {
    this._death.dispose();
    this._preCombat.dispose();
    this._spawn.dispose();
    this._hud.dispose();

    this.projectiles.forEach(p => p?.removeFromScene?.(this.scene));
    this.projectiles = [];

    this.enemies.forEach(e => {
      if (!e) return;
      e.setTargeted?.(false);
      this._pool.release(e);
    });
    this.enemies = [];
    this.tokens  = [];

    if (this._player) {
      this._player.dispose?.(this.scene);
      this._player.removeFromScene?.(this.scene);
      this._player = null;
    }

    this.hudCanvas?.setTokens?.([]);
    this.hudCanvas?.setOccluders?.([]);
    this.lexicon?.clearTarget?.();
    this._hud.flush([], null);

    this._unsubs.forEach(fn => fn());
    this._unsubs = [];

    this._particles?.dispose();
    this._particles = null;
    this._arena.dispose();
  }

  update(delta) {
    if (this._death.started) {
      this._particles?.update(delta);
      this._player?.update(delta);
      return;
    }

    if (this._preCombat.isActive) {
      this.hudCanvas.update(delta);
      this._particles?.update(delta);
      this._player?.update(delta);
      this._arena.update(delta);
      return;
    }

    this.physics.update(delta);
    this.hudCanvas.update(delta);
    this._particles?.update(delta);
    this._player?.update(delta);
    this._arena.update(delta);
    this._resources.update(delta);

    this._hud.tick(delta, this.enemies, this.lexicon.currentTargetId);
    this._spawn.tick(delta);
    this._updateProjectiles(delta);
    this._autoTarget();
    this._pruneDeadEnemies();

    this._waveTimer += delta * 1000;
    if (this._waveTimer >= WAVE_INTERVAL_MS && this.enemies.filter(e => e.active).length === 0) {
      this._waveTimer = 0;
      this._startWave();
    }
  }

  startCombatWithCountdown() {
    this._preCombat.start(this._death.started);
  }

  // Pre-compila programas WebGL + uploads de geometry para cada tipo de enemy.
  // renderer.compile() solo procesa programs si el objeto está visible+inFrustum,
  // por eso forzamos `frustumCulled=false` y posición frente a la cámara.
  // Además hacemos un render real a una RT temporal para garantizar JIT completo
  // (upload de VBOs, init de uniforms, link de programa, evaluación de defines).
  warmShaders(renderer, camera) {
    if (!renderer || !camera) return;
    const t0 = performance.now();

    // Posición frente a la cámara — dentro del frustum garantizado.
    const camPos  = camera.position;
    const fwd     = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const warmBase = camPos.clone().addScaledVector(fwd, 8);

    const acquired = [];
    Object.values(ENEMY_TYPES).forEach((type, i) => {
      const pos = warmBase.clone();
      pos.x += (i - 5) * 1.5; // spread lateral para que cada uno tenga su propio AABB
      const e = this._pool.acquire('warm', pos, type, 0);
      // Forzar inclusión en render list: visible + sin culling.
      e._group.visible = true;
      e._group.traverse(obj => { obj.frustumCulled = false; });
      acquired.push(e);
    });

    try {
      // Pass 1: compile programs.
      renderer.compile(this.scene, camera);
      // Pass 2: render real → fuerza upload de VBOs + ejecución del program GL.
      // Usamos una WebGLRenderTarget temporal para no flashear pantalla.
      const rt = new THREE.WebGLRenderTarget(64, 64);
      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(this.scene, camera);
      renderer.setRenderTarget(prevTarget);
      rt.dispose();
    } catch (err) {
      console.warn('[warmShaders] render warm falló:', err);
    }

    for (const e of acquired) this._pool.release(e);
    console.info(`[warmShaders] precompilados ${acquired.length} tipos en ${(performance.now() - t0).toFixed(1)}ms`);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _buildPlayer() {
    this._player = new CombatPlayerShip();
    this._player.addToScene(this.scene);
    this.hudCanvas?.setOccluders?.([{ object: this._player.mesh, radiusPx: 180 }]);
    this.hudCanvas?.setShipColor?.(this._player.laserColor);
  }

  _startWave() {
    this.wave++;
    waveTrace.beginWave(this.wave);
    // Speed casi plana — la dificultad real viene de spawn density + word length.
    // Wave1=2.0, wave10≈2.14, wave30≈2.20. Cap MAX=2.6 nunca dispara con scout (1.25×).
    const speed = ENEMY_BASE_SPEED + Math.min(0.25, Math.log2(this.wave + 1) * 0.05);
    EventBus.emit(EventTypes.WAVE_START, { waveNumber: this.wave });
    Bridge.setState({ wave: this.wave });
    waveTrace.bracket('SpawnDirector.beginWave', () =>
      this._spawn.beginWave(speed, () => this._death.started || this._preCombat.isActive)
    );
  }

  _spawnOne(type, speed, word, pos) {
    const t0 = performance.now();
    const enemy = waveTrace.bracket('Pool.acquire', () => this._pool.acquire(word, pos, type, speed), { type });
    if (this.enemies.includes(enemy)) return;
    const token = waveTrace.bracket('new WordToken', () => new WordToken(enemy));
    this.enemies.push(enemy);
    this.tokens.push(token);
    waveTrace.bracket('hudCanvas.setTokens', () =>
      this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active))
    );
    EventBus.emit(EventTypes.ENEMY_SPAWNED, { id: enemy.id, word, position: pos });
    waveTrace.bracket('hud.publish', () =>
      this._hud.publish(this.enemies, this.lexicon.currentTargetId)
    );
    waveTrace.mark('_spawnOne.total', { type, ms: +(performance.now() - t0).toFixed(3) });
  }

  _fireAt(enemy) {
    if (!this._player || !enemy?.active) return;
    const { flowActive } = Bridge.peekState();
    const shots = this._player.getMuzzleShots();
    shots.forEach((m, i) => {
      // Solo el primer cañón dispara hitFlash para evitar N flashes por ráfaga.
      const onHit = (i === 0) ? () => enemy.hitFlash?.() : () => {};
      const shot  = flowActive
        ? new LexBeam(m.anchor ?? m.origin, enemy, onHit, m.color, m.scale)
        : new Projectile(m.origin, enemy, onHit, m.color, m.scale);
      shot.addToScene(this.scene);
      this.projectiles.push(shot);
    });
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
    this.tokens.find(t => t.enemy.id === targetId)?.update(typed !== undefined ? typed : '');
    if (correct === false) {
      this._resources.addLexHeat(LEX_HEAT_ON_MISTAKE);
    } else if (correct) {
      const enemy = this.enemies.find(e => e.id === targetId);
      if (enemy) this._fireAt(enemy);
      this._player?.onLetterCorrect?.(0.85);
    }
  }

  _onWordCompleted({ enemyId }) {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy) return;
    this._particles.burstDestroy(enemy.position.clone(), {
      color: enemy._cfg?.color ?? 0x00ffcc,
      word:  enemy.word,
      intensity: 1.0,
    });
    enemy.setTargeted(false);
    this._releaseEnemy(enemy);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));
    this._hud.publish(this.enemies, this.lexicon.currentTargetId);
    this._player?.clearTarget();
    EventBus.emit(EventTypes.ENEMY_COLLAPSED, { id: enemyId, word: enemy.word });
  }

  _onEnemyReached({ id }) {
    if (this._death.started) return;
    const enemy = this.enemies.find(e => e.id === id);
    if (!enemy || !enemy.active) return;
    this._particles.burst(enemy.position.clone());
    this._particles.burstDestroy(enemy.position.clone(), {
      color: 0xff4444,
      word:  enemy.word,
      intensity: 0.7,
    });
    this._releaseEnemy(enemy);
    this.hudCanvas.setTokens(this.tokens.filter(t => t.enemy.active));
    this._hud.publish(this.enemies, this.lexicon.currentTargetId);
    if (id === this.lexicon.currentTargetId) {
      this.lexicon.clearTarget(); this._player?.clearTarget();
    }
    this._player?.takeHit?.();
    this._resources.applyDamage(HIT_DAMAGE);
    this._resources.addLexHeat(LEX_HEAT_ON_HIT);
    EventBus.emit(EventTypes.PLAYER_HIT, { damage: HIT_DAMAGE });
    if (this._resources.isDead) this._death.start();
  }

  _onForcePlayerDeath() {
    if (this._death.started) return;
    this._preCombat.stop();
    this._death.start();
  }

  // Release helper: remueve enemy del array activo Y del token list ANTES
  // de devolverlo al pool. Sin esto, pool reuses la misma instancia y push
  // duplica refs en `this.enemies` → PhysicsSystem.update lo mueve N veces/frame.
  _releaseEnemy(enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
    // Dedupe defensivo — si el mismo enemy ya estaba duplicado, limpia todas las refs.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i] === enemy) this.enemies.splice(i, 1);
    }
    // Tokens: remueve los apuntando a este enemy.
    this.tokens = this.tokens.filter(t => t.enemy !== enemy);
    this._pool.release(enemy);
  }

  _pruneDeadEnemies() {
    // Safety net: filtra inactivos si por alguna razón quedaron en el array.
    if (this.enemies.length     > 100) this.enemies     = this.enemies.filter(e => e.active);
    if (this.tokens.length      > 100) this.tokens      = this.tokens.filter(t => t.enemy.active);
    if (this.projectiles.length > 100) this.projectiles = this.projectiles.filter(pp => pp.active);
  }
}
