import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import {
  PLAYER_MAX_HP,
  LEX_HEAT_MAX, LEX_HEAT_ON_MISTAKE, LEX_HEAT_ON_HIT,
  LEX_HEAT_DECAY_PER_SEC,
  OVERHEAT_THRESHOLD, OVERHEAT_DURATION_SEC,
} from '../../shared/constants.js';

// Cooldown after overheat ends before it can re-trigger
const OVERHEAT_COOLDOWN_SEC = 2.0;

export class ProgressionSystem {
  constructor() {
    this._hull             = PLAYER_MAX_HP;
    this._lexHeat          = 0;
    this._isOverheated     = false;
    this._overheatLeft     = 0;
    this._overheatCooldown = 0;
  }

  reset() {
    this._hull             = PLAYER_MAX_HP;
    this._lexHeat          = 0;
    this._isOverheated     = false;
    this._overheatLeft     = 0;
    this._overheatCooldown = 0;
    this._publish();
  }

  // Damage goes directly to hull.
  applyDamage(amount) {
    this._hull = Math.max(0, this._hull - amount);
    this._publish();
  }

  // Adds LEX-HEAT. Ignored during active overheat to prevent stacking.
  addLexHeat(amount) {
    if (this._isOverheated) return;
    this._lexHeat = Math.min(LEX_HEAT_MAX, this._lexHeat + amount);
    this._publish();
  }

  // Call once per frame with delta in seconds.
  update(delta) {
    let changed = false;

    // --- Overheat countdown ---
    if (this._isOverheated) {
      this._overheatLeft -= delta;
      if (this._overheatLeft <= 0) {
        this._overheatLeft     = 0;
        this._isOverheated     = false;
        this._overheatCooldown = OVERHEAT_COOLDOWN_SEC;
        EventBus.emit(EventTypes.PLAYER_OVERHEAT_END);
        changed = true;
      }
    }

    if (this._overheatCooldown > 0) {
      this._overheatCooldown = Math.max(0, this._overheatCooldown - delta);
    }

    // --- LEX-HEAT passive decay ---
    if (this._lexHeat > 0) {
      this._lexHeat = Math.max(0, this._lexHeat - LEX_HEAT_DECAY_PER_SEC * delta);
      changed = true;
    }

    // --- Overheat trigger ---
    if (!this._isOverheated && this._overheatCooldown <= 0 && this._lexHeat >= OVERHEAT_THRESHOLD) {
      this._isOverheated = true;
      this._overheatLeft = OVERHEAT_DURATION_SEC;
      EventBus.emit(EventTypes.PLAYER_OVERHEAT_START);
      changed = true;
    }

    if (changed) this._publish();
  }

  get hull()   { return this._hull;          }
  get isDead() { return this._hull <= 0;     }

  getSnapshot() {
    return {
      hull:            this._hull,
      lexHeat:         this._lexHeat,
      isOverheated:    this._isOverheated,
      overheatTimeLeft: this._overheatLeft,
    };
  }

  _publish() {
    Bridge.setState({
      hp:              this._hull,
      maxHp:           PLAYER_MAX_HP,
      lexHeat:         this._lexHeat,
      lexHeatMax:      LEX_HEAT_MAX,
      isOverheated:    this._isOverheated,
      overheatTimeLeft: this._overheatLeft,
    });
  }
}
