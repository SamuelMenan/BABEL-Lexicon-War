import { Bridge } from '../../shared/bridge.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { WARN_PROXIMITY_YELLOW_M, WARN_PROXIMITY_RED_M } from '../../shared/constants.js';

export class HudPublisher {
  constructor() {
    this._prevWarningGlobal = 'none';
    this._throttleAcc = 0;
  }

  // Call from update(); publishes at ~11 Hz
  tick(delta, enemies, currentTargetId) {
    this._throttleAcc += delta * 1000;
    if (this._throttleAcc >= 90) {
      this._throttleAcc = 0;
      this.publish(enemies, currentTargetId);
    }
  }

  publish(enemies, currentTargetId) {
    const active  = enemies.filter(e => e.active);
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
    this._throttleAcc = 0;
  }
}
