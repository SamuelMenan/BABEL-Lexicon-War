// Registra todas las DEBUG_* actions en KeybindService.
// Solo activas si profile.debugEnabled (gateado por el propio service).

import { KeybindService } from '../../shared/keybindService.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { toggleBot, toggleTelemetry } from '../systems/AutoTyper.js';
import { resetTutorialFlags } from '../../shared/tutorialFlags.js';

let _installed = false;
const _unsubs = [];

export function initDebugBindings() {
  if (_installed) return;
  _installed = true;

  // F9 — toggle performance
  _unsubs.push(KeybindService.register('global', 'DEBUG_PERF', () => {
    EventBus.emit(EventTypes.PERFORMANCE_TOGGLE);
  }));

  // F10 — toggle telemetria
  _unsubs.push(KeybindService.register('global', 'DEBUG_TELEMETRY', () => {
    toggleTelemetry();
  }));

  // F11 — toggle AutoTyper bot
  _unsubs.push(KeybindService.register('global', 'DEBUG_BOT', () => {
    toggleBot();
  }));

  // F12 — toggle debug markers (hangar)
  _unsubs.push(KeybindService.register('global', 'DEBUG_MARKERS', () => {
    Bridge.setState({ debugMarkersVisible: !Bridge.peekState().debugMarkersVisible });
  }));

  // Insert — reset flags tutoriales (sin reload)
  _unsubs.push(KeybindService.register('global', 'DEBUG_RESET_TUT', () => {
    resetTutorialFlags();
    Bridge.commands.resetTutorials();
    console.log('[Debug] Tutorial flags reset');
  }));

  // Home — force player death
  _unsubs.push(KeybindService.register('gameplay', 'DEBUG_DEATH', () => {
    EventBus.emit(EventTypes.DEBUG_FORCE_PLAYER_DEATH);
  }));

  // End — skip wave (placeholder hasta wiring especifico en CombatSceneManager)
  _unsubs.push(KeybindService.register('gameplay', 'DEBUG_SKIP_WAVE', () => {
    EventBus.emit('debug:skip_wave');
  }));

  // PageUp — +50 grafemas
  _unsubs.push(KeybindService.register('global', 'DEBUG_GRAF_PLUS', () => {
    EventBus.emit(EventTypes.GRAFEMAS_AWARDED, { amount: 50, source: 'debug' });
  }));

  // PageDown — -50 grafemas
  _unsubs.push(KeybindService.register('global', 'DEBUG_GRAF_MINUS', () => {
    EventBus.emit(EventTypes.GRAFEMAS_SPENT, { amount: 50, reason: 'debug' });
  }));

  // Pause — freeze hard del loop
  _unsubs.push(KeybindService.register('global', 'DEBUG_FREEZE', () => {
    const s = Bridge.peekState();
    if (s.isPaused) Bridge.commands.resumeGame();
    else Bridge.commands.pauseGame();
  }));

  // ScrollLock — toggle wave trace
  _unsubs.push(KeybindService.register('gameplay', 'DEBUG_WAVETRACE', () => {
    EventBus.emit('debug:toggle_wave_trace');
  }));

  // PrintScreen — snapshot estado a consola
  _unsubs.push(KeybindService.register('global', 'DEBUG_SNAPSHOT', () => {
    console.log('[Debug] Bridge state snapshot:', Bridge.getState());
  }));

  console.log('[DebugBindings] registered (gated by profile.debugEnabled)');
}

export function destroyDebugBindings() {
  _unsubs.forEach(fn => fn());
  _unsubs.length = 0;
  _installed = false;
}
