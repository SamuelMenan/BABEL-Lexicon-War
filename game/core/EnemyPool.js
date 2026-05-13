// Object Pool de CombatEnemy — evita lag spikes por GC al cambiar de oleada.
// - prewarm(n): pre-instancia n enemigos inactivos (opcionalmente progresivo).
// - acquire(word, position, type, speed): saca uno listo del free list.
// - release(enemy): lo devuelve, oculta el mesh, no lo remueve del scene.
// - expand dinámico si free list se vacía (con warning).

import * as THREE from 'three';
import { CombatEnemy, ENEMY_TYPES } from '../entities/CombatEnemy.js';

const DEFAULT_POOL_SIZE = 500;
const NEUTRAL_POS       = new THREE.Vector3(0, -9999, 0); // off-screen para warmup

export class EnemyPool {
  constructor(scene, { size = DEFAULT_POOL_SIZE } = {}) {
    this._scene = scene;
    this._size  = size;
    this._free  = [];
    this._all   = [];
    this._expansions = 0;
  }

  // Bulk allocation (instant). Para arranque del juego.
  prewarm(n = this._size) {
    for (let i = 0; i < n; i++) this._instantiate();
  }

  // Allocation progresiva en N frames — útil para loading screen.
  // perFrame: cuántos crear por tick. Retorna Promise resuelta al terminar.
  prewarmProgressive(total = this._size, perFrame = 8) {
    return new Promise((resolve) => {
      let created = 0;
      const tick = () => {
        const batch = Math.min(perFrame, total - created);
        for (let i = 0; i < batch; i++) this._instantiate();
        created += batch;
        if (created >= total) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  _instantiate() {
    const e = new CombatEnemy('', NEUTRAL_POS, 0, ENEMY_TYPES.SCOUT);
    e.active = false;
    e.setVisible(false);
    e.addToScene(this._scene);
    this._all.push(e);
    this._free.push(e);
    return e;
  }

  acquire(word, position, type = ENEMY_TYPES.SCOUT, speed = 0) {
    let e = this._free.pop();
    if (!e) {
      // expansión dinámica
      this._expansions++;
      if (this._expansions <= 3 || this._expansions % 50 === 0) {
        console.warn(`[EnemyPool] expanded (${this._expansions}), size=${this._all.length + 1}`);
      }
      e = this._instantiate();
      this._free.pop(); // remove from free since acquiring immediately
    }
    e.reset(word, position, type, speed);
    return e;
  }

  release(enemy) {
    if (!enemy) return;
    enemy.active   = false;
    enemy.targeted = false;
    enemy.setVisible(false);
    // Park lejos para que distance checks no lo encuentren accidentalmente
    enemy._group.position.copy(NEUTRAL_POS);
    if (!this._free.includes(enemy)) this._free.push(enemy);
  }

  releaseAll() {
    for (const e of this._all) this.release(e);
  }

  getActive() { return this._all.filter(e => e.active); }
  get size()       { return this._all.length; }
  get freeCount()  { return this._free.length; }

  dispose() {
    for (const e of this._all) {
      e._disposeOwnMaterials?.();
      e.removeFromScene(this._scene);
    }
    this._all.length  = 0;
    this._free.length = 0;
  }
}
