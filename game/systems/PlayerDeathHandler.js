import * as THREE from 'three';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';

export class PlayerDeathHandler {
  // All deps as getters/callbacks so the handler can be constructed before init()
  constructor({ getParticles, getPlayer, getLexicon, getProjectiles, clearProjectiles,
                getEnemies, hudCanvas, cam, scene, getWave, onPublish }) {
    this._getParticles     = getParticles;
    this._getPlayer        = getPlayer;
    this._getLexicon       = getLexicon;
    this._getProjectiles   = getProjectiles;
    this._clearProjectiles = clearProjectiles;
    this._getEnemies       = getEnemies;
    this._hudCanvas        = hudCanvas;
    this._cam              = cam;
    this._scene            = scene;
    this._getWave          = getWave;
    this._onPublish        = onPublish;
    this._started          = false;
    this._gameOverTimer    = null;
    this._burstTimers      = [];
  }

  get started() { return this._started; }

  start() {
    this._started = true;
    this._cam?.trackX(0);

    const enemies = this._getEnemies();
    enemies.forEach(e => {
      if (!e?.active) return;
      e.active = false;
      e.setTargeted?.(false);
      e.removeFromScene(this._scene);
    });

    this._hudCanvas.setTokens([]);
    this._getLexicon().clearTarget();

    this._getProjectiles().forEach(p => p.removeFromScene(this._scene));
    this._clearProjectiles();

    this._onPublish();
    EventBus.emit(EventTypes.PLAYER_DIED);

    const colPos = this._getPlayer()?.position.clone();
    if (colPos) {
      this._emitBursts(colPos);
      this._getParticles().burst(colPos.clone());
      this._getParticles().burst(colPos.clone());
    }

    this._getPlayer()?.startCollapse(this._scene, () => {
      this._gameOverTimer = setTimeout(() => {
        this._gameOverTimer = null;
        EventBus.emit(EventTypes.GAME_OVER, {
          score:    this._getWave(),
          wpm:      Bridge.getState().wpm,
          accuracy: Bridge.getState().accuracy,
        });
      }, 600);
    });
  }

  dispose() {
    if (this._gameOverTimer) { clearTimeout(this._gameOverTimer); this._gameOverTimer = null; }
    this._burstTimers.forEach(t => clearTimeout(t));
    this._burstTimers = [];
    this._started = false;
  }

  _emitBursts(origin) {
    const offsets = [
      new THREE.Vector3( 0,     0,     0    ),
      new THREE.Vector3(-0.45,  0.22, -0.12 ),
      new THREE.Vector3( 0.52, -0.08,  0.16 ),
      new THREE.Vector3( 0.0,   0.36, -0.24 ),
      new THREE.Vector3(-0.22, -0.28,  0.1  ),
    ];
    offsets.forEach((off, i) => {
      const t = setTimeout(() => {
        this._burstTimers = this._burstTimers.filter(x => x !== t);
        this._getParticles().burstCollapse(origin.clone().add(off));
      }, i * 140);
      this._burstTimers.push(t);
    });
  }
}
