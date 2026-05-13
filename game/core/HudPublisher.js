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
    // Pre-allocated buffers — reuse, no per-frame allocation.
    this._activeBuf   = [];
    this._seenIds     = new Set();
    this._entryPool   = []; // {id,word,distance,targeted} reusables
    this._warningsBuf = {
      proximityLevel: 'none',
      closestEnemyDistance: null,
      lowHpLevel: 'none',
      lowHp: false,
      globalLevel: 'none',
    };
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
    // Reusable internal buffer (no React impact).
    this._activeBuf.length = 0;
    this._seenIds.clear();
    let minDist = Infinity;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || !e.active) continue;
      if (!e.id || !e.word) continue;
      const d = e.distanceToPlayer;
      if (typeof d !== 'number' || d <= 0 || d > 5000) continue;
      if (this._seenIds.has(e.id)) continue;
      this._seenIds.add(e.id);
      this._activeBuf.push(e);
      if (d < minDist) minDist = d;
    }

    const proximityLevel = this._deriveProximityLevel(minDist);
    const prevWarnings   = Bridge.peekState().warnings;
    const lowHpLevel     = prevWarnings?.lowHpLevel ?? 'none';
    const globalLevel    = this._deriveGlobalWarningLevel(proximityLevel, lowHpLevel);

    // React necesita refs nuevas para reconciliar — pero solo allocamos lo
    // que React inspecciona. Sin Set/spread/map intermedios.
    const n = this._activeBuf.length;
    const payload = new Array(n);
    for (let i = 0; i < n; i++) {
      const e = this._activeBuf[i];
      payload[i] = {
        id: e.id, word: e.word,
        distance: Math.round(e.distanceToPlayer),
        targeted: e.id === currentTargetId,
      };
    }

    Bridge.setState({
      combatEnemies: payload,
      swarmRemnants: n,
      warnings: {
        ...(prevWarnings || {}),
        proximityLevel,
        closestEnemyDistance: Number.isFinite(minDist) ? Math.round(minDist) : null,
        lowHpLevel,
        lowHp: lowHpLevel !== 'none',
        globalLevel,
      },
    });

    if (this._prevWarningGlobal !== globalLevel) {
      this._prevWarningGlobal = globalLevel;
      EventBus.emit(EventTypes.WARNING_CHANGED, { source: 'combat', warnings: Bridge.peekState().warnings });
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
