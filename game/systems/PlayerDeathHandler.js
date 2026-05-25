import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { SHIP_PALETTES } from '../../shared/constants.js';
import { playSfx, stopLoopSfx } from '../../shared/audioManager.js';

const CINEMATIC_DELAY_MS = 1800; // breathing room after destruction before Game Over

// Read normalRamp from SHIP_PALETTES — single source of truth for ship colors.
// Falls back to spaceshipnew if the ship ID has no palette entry.
function _getRampForShip(shipId) {
  return (SHIP_PALETTES[shipId] ?? SHIP_PALETTES.spaceshipnew).normalRamp;
}

export class PlayerDeathHandler {
  constructor({ getParticles, getPlayer, getLexicon, getProjectiles, clearProjectiles,
                getEnemies, hudCanvas, cam, scene, getWave, getTimeElapsed, onPublish }) {
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
    this._getTimeElapsed   = getTimeElapsed ?? (() => null);
    this._onPublish        = onPublish;
    this._started          = false;
    this._gameOverTimer    = null;
    this._burstTimers      = [];
  }

  get started() { return this._started; }

  start() {
    this._started = true;
    // Stop combat health loops al iniciar secuencia de muerte.
    stopLoopSfx('health.high_loop');
    stopLoopSfx('health.medium_loop');
    stopLoopSfx('health.critical_loop');
    // Snapshot stats AT death moment (before cinematic). WPM uses a 5s rolling
    // window; reading after the 1.8s cinematic risks decay to 0 if the player
    // wasn't typing in the final seconds. Peak survives regardless.
    const sAtDeath = Bridge.getState();
    this._statsSnapshot = {
      wpm:            sAtDeath.wpm,
      accuracy:       sAtDeath.accuracy,
      peakWPM:        sAtDeath.peakWPM ?? null,
      wordsDestroyed: sAtDeath.wordsDestroyed ?? null,
      bestCombo:      sAtDeath.bestCombo ?? null,
    };
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
        playSfx('explosion.detonate');
        this._getParticles().playerDeathSequence(colPos, colorRamp);
      }

      this._gameOverTimer = setTimeout(() => {
        this._gameOverTimer = null;
        const snap    = this._statsSnapshot || {};
        const elapsed = this._getTimeElapsed();
        // WPM Medio (estandar mecanografia competitiva): (correctChars/5)/minutos.
        // Misma formula que racing — usada para definir ganadores en modo online.
        const lex            = this._getLexicon?.();
        const correctKeys    = lex?.getCorrectKeys?.() ?? 0;
        const minutesElapsed = Number.isFinite(elapsed) && elapsed > 0 ? elapsed / 60 : 0;
        const avgWpm = minutesElapsed > 0 && correctKeys > 0
          ? Math.round((correctKeys / 5) / minutesElapsed)
          : null;
        const peakWpm = snap.peakWPM ?? null;
        EventBus.emit(EventTypes.GAME_OVER, {
          // Combat: `score` = wave reached (waves index combat progression).
          // Race uses `score` for phrases done; views partition by mode so no mix.
          score:           this._getWave(),
          wave:            this._getWave(),
          // wpm = WPM Medio del match (no la ventana de 5s al morir).
          wpm:             avgWpm,
          accuracy:        snap.accuracy ?? null,
          wordsDestroyed:  snap.wordsDestroyed ?? null,
          bestCombo:       snap.bestCombo ?? null,
          // Peak no inferior al medio.
          peakWPM:         Math.max(peakWpm || 0, avgWpm || 0) || null,
          timeElapsed:     Number.isFinite(elapsed) ? Math.round(elapsed) : null,
          grafemasReward:  null,
          raceVictory:     null,
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
