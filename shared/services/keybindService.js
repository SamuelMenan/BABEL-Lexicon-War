// Servicio central de keybindings — unico window keydown listener.
// Scope stack: top scope tiene prioridad. 'global' siempre activo en base.
//
// Uso:
//   KeybindService.init()                       — boot una vez (app/main.jsx)
//   KeybindService.register(scope, action, fn)  — handler para un action en un scope
//   KeybindService.unregister(scope, action)
//   const tok = KeybindService.pushScope(scope) — ej. abrir modal; devuelve token
//   KeybindService.popScope(token | scope)      — cerrar modal (preferir token)
//   KeybindService.setOverrides(overrides)      — desde playerProfile
//   KeybindService.setDebugEnabled(bool)        — gate de DEBUG_* actions

import { ACTIONS, SCOPES, normalizeKey, resolveBinding } from '../config/keybindings.js';
import { playSfx } from './audioManager.js';

// Hard cap del stack — más allá de esto asumimos leak (StrictMode, unmount abrupto) y auto-purge.
const MAX_STACK_DEPTH = 8;

// scope → Map<actionId, handler>
const _handlers = new Map();
// stack de frames: { token: Symbol, scope: string }. Frame 0 = global base.
const _scopeStack = [{ token: Symbol('global'), scope: SCOPES.GLOBAL }];
let _overrides = {};
let _debugEnabled = false;
let _attached = false;

function getHandlers(scope) {
  if (!_handlers.has(scope)) _handlers.set(scope, new Map());
  return _handlers.get(scope);
}

function buildKeyToActionMap() {
  const map = new Map();
  for (const actionId of Object.keys(ACTIONS)) {
    const binding = resolveBinding(actionId, _overrides);
    if (!binding) continue;
    if (binding.debug && !_debugEnabled) continue;
    const keys = [binding.key];
    if (binding.alias) keys.push(binding.alias);
    for (const k of keys) {
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(actionId);
    }
  }
  return map;
}

let _keyMap = buildKeyToActionMap();
function rebuild() { _keyMap = buildKeyToActionMap(); }

function topFrame() { return _scopeStack[_scopeStack.length - 1]; }
function topScope() { return topFrame().scope; }

function actionsForKey(e) {
  const k = normalizeKey(e.key);
  return _keyMap.get(k) ?? [];
}

function dispatch(e) {
  const candidates = actionsForKey(e);
  if (candidates.length === 0) return false;

  for (let i = _scopeStack.length - 1; i >= 0; i--) {
    const { scope } = _scopeStack[i];
    const handlers = _handlers.get(scope);
    if (!handlers) continue;
    for (const actionId of candidates) {
      const def = ACTIONS[actionId];
      if (!def) continue;
      if (!def.scopes.includes('*') && !def.scopes.includes(scope)) continue;
      const fn = handlers.get(actionId);
      if (typeof fn === 'function') {
        const consumed = fn(e, actionId) !== false;
        if (consumed) return true;
      }
    }
  }
  return false;
}

function isEditableTarget(t) {
  if (!t) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}

function onKeyDown(e) {
  if (isEditableTarget(e.target)) return;
  const consumed = dispatch(e);
  if (consumed) {
    if (normalizeKey(e.key) === 'Escape') playSfx('menuBack.press', 0.6);
    e.preventDefault();
  }
}

function autoPurgeIfLeaked() {
  if (_scopeStack.length > MAX_STACK_DEPTH) {
    console.warn(`[KeybindService] stack leak detectado (depth=${_scopeStack.length}). Auto-purge → [global].`);
    _scopeStack.length = 1; // preserve global base
  }
}

export const KeybindService = {
  init() {
    if (_attached) return;
    _attached = true;
    window.addEventListener('keydown', onKeyDown, { capture: false });
  },

  destroy() {
    if (!_attached) return;
    _attached = false;
    window.removeEventListener('keydown', onKeyDown, { capture: false });
    _handlers.clear();
    _scopeStack.length = 0;
    _scopeStack.push({ token: Symbol('global'), scope: SCOPES.GLOBAL });
  },

  register(scope, actionId, handler) {
    if (!ACTIONS[actionId]) {
      console.warn(`[KeybindService] action desconocida: ${actionId}`);
      return () => {};
    }
    getHandlers(scope).set(actionId, handler);
    return () => this.unregister(scope, actionId);
  },

  unregister(scope, actionId) {
    _handlers.get(scope)?.delete(actionId);
  },

  // Devuelve token único. popScope(token) hace pop solo si el token está en el stack.
  // Push idempotente: si top ya es el mismo scope, no duplica (devuelve token existente).
  pushScope(scope) {
    if (!Object.values(SCOPES).includes(scope)) {
      console.warn(`[KeybindService] scope desconocido: ${scope}`);
      return null;
    }
    const top = topFrame();
    if (top.scope === scope) {
      // Idempotencia: push consecutivo del mismo scope no duplica. Reusa token.
      return top.token;
    }
    const token = Symbol(scope);
    _scopeStack.push({ token, scope });
    autoPurgeIfLeaked();
    window.dispatchEvent(new CustomEvent('babel:scopechange'));
    return token;
  },

  // Acepta token (Symbol) o scope string (legacy).
  // Token: pop exacto del frame con ese token.
  // String: pop hasta encontrar el scope (no toca global base).
  popScope(tokenOrScope) {
    if (typeof tokenOrScope === 'symbol') {
      const idx = _scopeStack.findIndex(f => f.token === tokenOrScope);
      if (idx > 0) {
        _scopeStack.splice(idx, 1);
        window.dispatchEvent(new CustomEvent('babel:scopechange'));
      }
      return;
    }
    if (typeof tokenOrScope === 'string') {
      for (let i = _scopeStack.length - 1; i > 0; i--) {
        if (_scopeStack[i].scope === tokenOrScope) {
          _scopeStack.splice(i, 1);
          window.dispatchEvent(new CustomEvent('babel:scopechange'));
          return;
        }
      }
      return;
    }
    // Sin arg: pop del top si no es global.
    if (_scopeStack.length > 1) {
      _scopeStack.pop();
      window.dispatchEvent(new CustomEvent('babel:scopechange'));
    }
  },

  setScope(scope) {
    if (!Object.values(SCOPES).includes(scope)) return;
    if (_scopeStack.length === 1) {
      _scopeStack.push({ token: Symbol(scope), scope });
    } else {
      _scopeStack[1] = { token: Symbol(scope), scope };
    }
    window.dispatchEvent(new CustomEvent('babel:scopechange'));
  },

  getScopes() { return _scopeStack.map(f => f.scope); },
  getStackDepth() { return _scopeStack.length; },
  getTopScope() { return topScope(); },

  setOverrides(overrides) {
    _overrides = { ...(overrides || {}) };
    rebuild();
  },

  setDebugEnabled(enabled) {
    _debugEnabled = !!enabled;
    rebuild();
  },

  isDebugEnabled() { return _debugEnabled; },

  getBinding(actionId) {
    return resolveBinding(actionId, _overrides);
  },
};
