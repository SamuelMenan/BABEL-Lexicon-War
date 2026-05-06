import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { SHIP_PALETTES } from '../../shared/constants.js';

const CINEMATIC_DELAY_MS = 1800; // breathing room after destruction before Game Over

// Read normalRamp from SHIP_PALETTES — single source of truth for ship colors.
// Falls back to spaceshipnew if the ship ID has no palette entry.
function _getRampForShip(shipId) {
  return (SHIP_PALETTES[shipId] ?? SHIP_PALETTES.spaceshipnew).normalRamp;
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

    // Resolve ship color palette from SHIP_PALETTES (single source of truth)
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
