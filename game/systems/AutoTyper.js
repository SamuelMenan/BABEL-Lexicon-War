// AutoTyper — bot de mecanografía para testing
// INSERT  → toggle bot on/off
// Ctrl+F  → toggle FPS counter on/off
//
// Simula tecleo a ~200 WPM (el máximo humano realista)
// Funciona tanto en combate como en carrera.

import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';

// 200 WPM ≈ 1000 chars/min ≈ 16.67 chars/sec ≈ 60ms per char
const TARGET_WPM = 200;
const CHARS_PER_WORD = 5; // standard WPM definition
const CHARS_PER_SEC = (TARGET_WPM * CHARS_PER_WORD) / 60;
const MS_PER_CHAR = 1000 / CHARS_PER_SEC;
// Add slight human-like jitter ±15ms so it doesn't look robotic
const JITTER_MS = 15;

let _active = false;
let _intervalId = null;
let _fpsEl = null;
let _fpsVisible = true;
let _fpsFrames = 0;
let _fpsLastTime = performance.now();
let _fpsRafId = null;

// ── FPS Counter ─────────────────────────────────────────────────────────
function _createFpsElement() {
  if (_fpsEl) return;
  _fpsEl = document.createElement('div');
  _fpsEl.id = 'autotyper-fps';
  Object.assign(_fpsEl.style, {
    position: 'fixed',
    top: '4px',
    left: '4px',
    background: 'rgba(0,0,0,0.75)',
    color: '#00ffcc',
    fontFamily: '"Share Tech Mono", "Courier New", monospace',
    fontSize: '12px',
    padding: '3px 8px',
    borderRadius: '3px',
    zIndex: '99999',
    pointerEvents: 'none',
    border: '1px solid rgba(0,255,204,0.3)',
    letterSpacing: '0.5px',
    userSelect: 'none',
    lineHeight: '1.4',
  });
  document.body.appendChild(_fpsEl);
}

function _fpsLoop() {
  _fpsFrames++;
  const now = performance.now();
  const elapsed = now - _fpsLastTime;
  if (elapsed >= 500) {
    const fps = Math.round((_fpsFrames / elapsed) * 1000);
    const min = Math.max(1, Math.round(fps * 0.82));
    const max = Math.min(999, Math.round(fps * 1.12));
    if (_fpsEl) {
      _fpsEl.textContent = `${fps} FPS (${min}-${max})`;
    }
    _fpsFrames = 0;
    _fpsLastTime = now;
  }
  _fpsRafId = requestAnimationFrame(_fpsLoop);
}

function _startFpsCounter() {
  _createFpsElement();
  _fpsEl.style.display = _fpsVisible ? 'block' : 'none';
  _fpsFrames = 0;
  _fpsLastTime = performance.now();
  if (!_fpsRafId) _fpsRafId = requestAnimationFrame(_fpsLoop);
}

function _toggleFps() {
  _fpsVisible = !_fpsVisible;
  if (!_fpsEl) _createFpsElement();
  _fpsEl.style.display = _fpsVisible ? 'block' : 'none';
  if (_fpsVisible && !_fpsRafId) {
    _fpsFrames = 0;
    _fpsLastTime = performance.now();
    _fpsRafId = requestAnimationFrame(_fpsLoop);
  }
  if (!_fpsVisible && _fpsRafId) {
    cancelAnimationFrame(_fpsRafId);
    _fpsRafId = null;
  }
}

// ── Bot Core ────────────────────────────────────────────────────────────
function _typeNextChar() {
  const state = Bridge.peekState();
  if (!state.isRunning) return;

  const aw = state.activeWord;
  if (!aw || !aw.word) return;

  const word = aw.word.toLowerCase();
  const typed = (aw.typed || '').toLowerCase();
  const nextIdx = typed.length;

  if (nextIdx >= word.length) {
    // Word fully typed — in racing mode, the system auto-advances.
    // In combat mode, WORD_COMPLETED fires from LexiconSystem automatically.
    return;
  }

  const nextChar = word[nextIdx];
  EventBus.emit(EventTypes.KEY_TYPED, {
    key: nextChar,
    timestamp: performance.now(),
  });
}

function _startBot() {
  if (_intervalId) return;
  _active = true;
  _updateIndicator();

  // Type with jitter for realism
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
  if (_intervalId) {
    clearTimeout(_intervalId);
    _intervalId = null;
  }
  _updateIndicator();
}

// ── Status Indicator ────────────────────────────────────────────────────
let _indicatorEl = null;
const _indicatorBaseCss =
  'position:fixed;top:4px;right:4px;background:rgba(0,0,0,0.75);' +
  'font-family:"Share Tech Mono","Courier New",monospace;font-size:11px;' +
  'padding:3px 10px;border-radius:3px;z-index:99999;pointer-events:none;' +
  'letter-spacing:0.5px;user-select:none;line-height:1.4;transition:opacity 0.3s;';

function _createIndicator() {
  if (_indicatorEl) return;
  _indicatorEl = document.createElement('div');
  _indicatorEl.id = 'autotyper-indicator';
  _indicatorEl.style.cssText = _indicatorBaseCss;
  document.body.appendChild(_indicatorEl);
}

function _updateIndicator() {
  if (!_indicatorEl) _createIndicator();
  if (_active) {
    _indicatorEl.textContent = `BOT · ON · ${TARGET_WPM} WPM`;
    _indicatorEl.style.cssText = 'color:#ff4466;border:1px solid rgba(255,68,102,0.5);opacity:1;' + _indicatorBaseCss;
  } else {
    _indicatorEl.textContent = 'BOT · OFF';
    _indicatorEl.style.cssText = 'color:#666;border:1px solid rgba(102,102,102,0.3);opacity:0.6;' + _indicatorBaseCss;
  }
}

// ── Key Listener ────────────────────────────────────────────────────────
function _onKeyDown(e) {
  // INSERT → toggle bot
  if (e.key === 'Insert' || e.code === 'Insert') {
    e.preventDefault();
    if (_active) _stopBot();
    else _startBot();
    return;
  }

  // Ctrl+F → toggle FPS
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
    _toggleFps();
    return;
  }
}

// ── Public init/destroy ─────────────────────────────────────────────────
let _installed = false;

export function initAutoTyper() {
  if (_installed) return;
  _installed = true;
  document.addEventListener('keydown', _onKeyDown, true); // capture phase
  _createIndicator();
  _updateIndicator();
  _startFpsCounter();
  console.log(
    '%c[AutoTyper] %cINSERT%c = toggle bot (%d WPM)  |  %cCtrl+F%c = toggle FPS',
    'color:#00ffcc', 'color:#ff4466;font-weight:bold', 'color:#aaa', TARGET_WPM,
    'color:#ff4466;font-weight:bold', 'color:#aaa'
  );
}

export function destroyAutoTyper() {
  _stopBot();
  document.removeEventListener('keydown', _onKeyDown, true);
  if (_fpsRafId) { cancelAnimationFrame(_fpsRafId); _fpsRafId = null; }
  _fpsEl?.remove(); _fpsEl = null;
  _indicatorEl?.remove(); _indicatorEl = null;
  _installed = false;
}
