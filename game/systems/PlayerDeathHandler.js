import * as THREE from 'three';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { SHIP_BOOSTER_CONFIGS } from '../rendering/booster/BoosterConfig.js';

const CINEMATIC_DELAY_MS = 1800; // breathing room after destruction before Game Over

// Extract normalRamp from the first hangar booster config for the selected ship.
// Falls back to spaceshipnew if the ship has no dedicated config.
function _getRampForShip(shipId) {
  const key    = `hangar_${shipId}_0`;
  const config = SHIP_BOOSTER_CONFIGS[key] ?? SHIP_BOOSTER_CONFIGS['hangar_spaceshipnew_0'];
  return config?.normalRamp ?? null;
}

export class PlayerDeathHandler {
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

    // Screen shake starts immediately with the ship trembling
    this._cam?.shake(1.1, 0.9);

    // Resolve ship color palette from booster config
    const { selectedShip } = Bridge.peekState();
    const colorRamp = _getRampForShip(selectedShip);

    const colPos = this._getPlayer()?.position.clone();

    // Ship shakes for ~0.85s, then onDone fires → particles + Game Over timer
    this._getPlayer()?.startCollapse(this._scene, () => {
      if (colPos) {
        this._getParticles().playerDeathSequence(colPos, colorRamp);
      }

      this._gameOverTimer = setTimeout(() => {
        this._gameOverTimer = null;
        EventBus.emit(EventTypes.GAME_OVER, {
          score:    this._getWave(),
          wpm:      Bridge.getState().wpm,
          accuracy: Bridge.getState().accuracy,
        });
      }, CINEMATIC_DELAY_MS);
    });
  }

  dispose() {
    if (this._gameOverTimer) { clearTimeout(this._gameOverTimer); this._gameOverTimer = null; }
    this._burstTimers.forEach(t => clearTimeout(t));
    this._burstTimers = [];
    this._started = false;
  }
}
