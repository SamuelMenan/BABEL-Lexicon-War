import { EventBus } from '@shared/state/events.js';
import { EventTypes } from '@shared/state/eventTypes.js';
import { Bridge } from '@shared/state/bridge.js';
import { playSfx } from '@shared/services/audioManager.js';

const COUNT_STEPS = new Set(['5', '4', '3', '2', '1']);

const PREPARE_MS = 600;
const STEP_MS    = 700;
const ENGAGE_MS  = 450;

const STEPS = {
  PREPARE: 'prepare', FIVE: '5', FOUR: '4', THREE: '3',
  TWO: '2', ONE: '1', ENGAGE: 'engage',
};

const MESSAGES = {
  [STEPS.PREPARE]: 'preCombat.prepare',
  [STEPS.FIVE]:    'preCombat.align',
  [STEPS.FOUR]:    'preCombat.stabilize',
  [STEPS.THREE]:   'preCombat.sync',
  [STEPS.TWO]:     'preCombat.lock',
  [STEPS.ONE]:     'preCombat.imminent',
  [STEPS.ENGAGE]:  'preCombat.syntaxError',
};

export class PreCombatController {
  // onEngaged: () => void — called when countdown completes
  constructor({ onEngaged }) {
    this._onEngaged = onEngaged;
    this._active    = false;
    this._timers    = [];
  }

  get isActive() { return this._active; }

  start(isDead) {
    if (isDead) return;
    this.stop();
    this._active = true;

    EventBus.emit(EventTypes.COMBAT_COUNTDOWN_START, { step: STEPS.PREPARE });
    Bridge.setState({
      preCombatActive: true, preCombatStep: STEPS.PREPARE,
      preCombatValue: null, preCombatMessage: MESSAGES[STEPS.PREPARE], preCombatLevel: 'yellow',
    });

    this._schedule(PREPARE_MS,                            () => this._tick(STEPS.FIVE,   '5',      'yellow'));
    this._schedule(PREPARE_MS + STEP_MS,                  () => this._tick(STEPS.FOUR,   '4',      'yellow'));
    this._schedule(PREPARE_MS + STEP_MS * 2,              () => this._tick(STEPS.THREE,  '3',      'yellow'));
    this._schedule(PREPARE_MS + STEP_MS * 3,              () => this._tick(STEPS.TWO,    '2',      'yellow'));
    this._schedule(PREPARE_MS + STEP_MS * 4,              () => this._tick(STEPS.ONE,    '1',      'red'));
    this._schedule(PREPARE_MS + STEP_MS * 5,              () => this._tick(STEPS.ENGAGE, 'preCombat.engage', 'red'));
    this._schedule(PREPARE_MS + STEP_MS * 5 + ENGAGE_MS, () => {
      this._active = false;
      this._clearTimers();
      this._resetBridgeState();
      EventBus.emit(EventTypes.COMBAT_COUNTDOWN_END, { step: STEPS.ENGAGE });
      this._onEngaged();
    });
  }

  stop() {
    this._clearTimers();
    this._active = false;
    this._resetBridgeState();
  }

  dispose() { this.stop(); }

  _schedule(ms, cb) {
    const t = setTimeout(() => {
      this._timers = this._timers.filter(x => x !== t);
      if (!this._active) return;
      cb();
    }, ms);
    this._timers.push(t);
  }

  _tick(step, value, level) {
    if (COUNT_STEPS.has(step)) playSfx('countdown.tick');
    else if (step === 'engage') playSfx('countdown.go');
    EventBus.emit(EventTypes.COMBAT_COUNTDOWN_TICK, { step, value, level });
    Bridge.setState({
      preCombatActive: true, preCombatStep: step,
      preCombatValue: value, preCombatMessage: MESSAGES[step], preCombatLevel: level,
    });
  }

  _clearTimers() {
    this._timers.forEach(t => clearTimeout(t));
    this._timers = [];
  }

  _resetBridgeState() {
    Bridge.setState({
      preCombatActive: false, preCombatStep: null,
      preCombatValue: null, preCombatMessage: '', preCombatLevel: 'yellow',
    });
  }
}
