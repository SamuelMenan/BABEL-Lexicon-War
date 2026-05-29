// AutoTyper — bot de mecanografia para testing
// INSERT  → toggle bot on/off
// Ctrl+F  → toggle panel de telemetria (FPS / heap)

import { EventBus } from '@shared/state/events.js';
import { EventTypes } from '@shared/state/eventTypes.js';
import { Bridge } from '@shared/state/bridge.js';

// 200 WPM ≈ 1000 chars/min ≈ 16.67 chars/sec ≈ 60ms per char
const TARGET_WPM = 200;
const CHARS_PER_WORD = 5;
const CHARS_PER_SEC = (TARGET_WPM * CHARS_PER_WORD) / 60;
const MS_PER_CHAR = 1000 / CHARS_PER_SEC;
const JITTER_MS = 15;

let _active = false;
let _intervalId = null;

// ── Bot Core ────────────────────────────────────────────────────────────
function _typeNextChar() {
  const state = Bridge.peekState();
  if (!state.isRunning) return;

  const aw = state.activeWord;
  if (!aw || !aw.word) return;

  const word = aw.word.toLowerCase();
  const typed = (aw.typed || '').toLowerCase();
  const nextIdx = typed.length;

  if (nextIdx >= word.length) return;

  const nextChar = word[nextIdx];
  EventBus.emit(EventTypes.KEY_TYPED, {
    key: nextChar,
    timestamp: performance.now(),
  });
}

function _startBot() {
  if (_intervalId) return;
  _active = true;
  Bridge.setState({ botActive: true });
  _updateIndicator();

  const tick = () => {
    _typeNextChar();
    const jitter = (Math.random() - 0.5) * 2 * JITTER_MS;
    const delay = Math.max(10, MS_PER_CHAR + jitter);
    _intervalId = setTimeout(tick, delay);
  };
  tick();
}

function _stopBot() {
  _active = false;
  Bridge.setState({ botActive: false });
  if (_intervalId) {
    clearTimeout(_intervalId);
    _intervalId = null;
  }
  _updateIndicator();
}

export function toggleBot() {
  if (_active) _stopBot();
  else _startBot();
}

// ── Status Indicator ────────────────────────────────────────────────────
let _indicatorEl = null;
const _indicatorBaseCss =
  'position:fixed;top:4px;right:4px;background:rgba(0,0,0,0.75);' +
  'font-family:"Share Tech Mono","Courier New",monospace;font-size:11px;' +
  'padding:3px 10px;border-radius:3px;z-index:99999;pointer-events:none;' +
  'letter-spacing:0.5px;user-select:none;line-height:1.4;transition:opacity 0.3s;';

function _isTouch() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches
      || 'ontouchstart' in window
      || navigator.maxTouchPoints > 0;
}

function _createIndicator() {
  if (_indicatorEl) return;
  if (_isTouch()) return; // En tactil el FAB ya muestra el estado.
  _indicatorEl = document.createElement('div');
  _indicatorEl.id = 'autotyper-indicator';
  _indicatorEl.style.cssText = _indicatorBaseCss;
  document.body.appendChild(_indicatorEl);
}

function _updateIndicator() {
  if (!_indicatorEl) _createIndicator();
  if (!_indicatorEl) return; // touch: sin indicador DOM
  if (_active) {
    _indicatorEl.textContent = `BOT · ON · ${TARGET_WPM} WPM`;
    _indicatorEl.style.cssText = 'color:#ff4466;border:1px solid rgba(255,68,102,0.5);opacity:1;' + _indicatorBaseCss;
  } else {
    _indicatorEl.textContent = 'BOT · OFF';
    _indicatorEl.style.cssText = 'color:#666;border:1px solid rgba(102,102,102,0.3);opacity:0.6;' + _indicatorBaseCss;
  }
}

// ── Telemetry toggle (publico para DebugBindings) ───────────────────────
export function toggleTelemetry() {
  const current = Bridge.peekState().telemetryVisible !== false;
  Bridge.setState({ telemetryVisible: !current });
}

// ── Public init/destroy ─────────────────────────────────────────────────
let _installed = false;

export function initAutoTyper() {
  if (_installed) return;
  _installed = true;
  _createIndicator();
  _updateIndicator();
}

export function destroyAutoTyper() {
  _stopBot();
  _indicatorEl?.remove(); _indicatorEl = null;
  _installed = false;
}
