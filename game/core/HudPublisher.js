import { Bridge } from '../../shared/bridge.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { WARN_PROXIMITY_YELLOW_M, WARN_PROXIMITY_RED_M } from '../../shared/constants.js';

// Throttle: HUD lateral solo necesita ~15Hz (66ms). El canvas 3D sigue a 60+ FPS.
const PUBLISH_INTERVAL_MS = 66;

export class HudPublisher {
  constructor() {
    this._prevWarningGlobal = 'none';
    this._throttleAcc       = 0;
    this._lastPublishMs     = 0;
  }

  // Llamado desde update(); throttled internamente.
  tick(delta, enemies, currentTargetId) {
    this._throttleAcc += delta * 1000;
    if (this._throttleAcc >= PUBLISH_INTERVAL_MS) {
      this._throttleAcc = 0;
      this.publish(enemies, currentTargetId);
    }
  }

  // Force-publish con guard rate-limit (eventos spawn/kill no spamean React).
  publish(enemies, currentTargetId) {
    const now = performance.now();
    if (now - this._lastPublishMs < PUBLISH_INTERVAL_MS) return;
    this._lastPublishMs = now;
    this._publishImmediate(enemies, currentTargetId);
  }

  // Bypass throttle — solo para death/teardown.
  flush(enemies, currentTargetId) {
    this._lastPublishMs = performance.now();
    this._publishImmediate(enemies, currentTargetId);
  }

  _publishImmediate(enemies, currentTargetId) {
    // Strict filter: vivos, no parked en pool, con id válido.
    const seen   = new Set();
    const active = [];
    for (const e of enemies) {
      if (!e || !e.active) continue;
      if (!e.id || !e.word) continue;
      if (typeof e.distanceToPlayer !== 'number' || e.distanceToPlayer <= 0) continue;
      if (e.distanceToPlayer > 5000) continue; // park sentinel
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      active.push(e);
    }

    const minDist = active.length > 0
      ? Math.min(...active.map(e => e.distanceToPlayer))
      : Infinity;

    const previousWarnings = Bridge.getState().warnings ?? {};
    const proximityLevel   = this._deriveProximityLevel(minDist);
    const lowHpLevel       = previousWarnings.lowHpLevel ?? 'none';
    const globalLevel      = this._deriveGlobalWarningLevel(proximityLevel, lowHpLevel);

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
        targeted: e.id === currentTargetId,
      })),
      swarmRemnants: active.length,
      warnings,
    });

    if (this._prevWarningGlobal !== globalLevel) {
      this._prevWarningGlobal = globalLevel;
      EventBus.emit(EventTypes.WARNING_CHANGED, { source: 'combat', warnings });
    }
  }

  _deriveProximityLevel(distance) {
    if (!Number.isFinite(distance)) return 'none';
    if (distance <= WARN_PROXIMITY_RED_M)    return 'red';
    if (distance <= WARN_PROXIMITY_YELLOW_M) return 'yellow';
    return 'none';
  }

  _deriveGlobalWarningLevel(proximityLevel, lowHpLevel) {
    if (proximityLevel === 'red'    || lowHpLevel === 'red')    return 'red';
    if (proximityLevel === 'yellow' || lowHpLevel === 'yellow') return 'yellow';
    return 'none';
  }

  dispose() {
    this._prevWarningGlobal = 'none';
    this._throttleAcc       = 0;
    this._lastPublishMs     = 0;
  }
}
