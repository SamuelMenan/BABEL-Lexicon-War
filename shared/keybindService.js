// Servicio central de keybindings — unico window keydown listener.
// Scope stack: top scope tiene prioridad. 'global' siempre activo en base.
//
// Uso:
//   KeybindService.init()                       — boot una vez (app/main.jsx)
//   KeybindService.register(scope, action, fn)  — handler para un action en un scope
//   KeybindService.unregister(scope, action)
//   KeybindService.pushScope(scope)             — ej. abrir modal
//   KeybindService.popScope(scope)              — cerrar modal
//   KeybindService.setOverrides(overrides)      — desde playerProfile
//   KeybindService.setDebugEnabled(bool)        — gate de DEBUG_* actions

import { ACTIONS, SCOPES, normalizeKey, resolveBinding } from './keybindings.js';
import { playSfx } from './audioManager.js';

// scope → Map<actionId, handler>
const _handlers = new Map();
// scope stack — top = mas prioritario. 'global' siempre presente.
const _scopeStack = [SCOPES.GLOBAL];
let _overrides = {};
let _debugEnabled = false;
let _attached = false;

function getHandlers(scope) {
  if (!_handlers.has(scope)) _handlers.set(scope, new Map());
  return _handlers.get(scope);
}

function buildKeyToActionMap() {
  // Construye lookup: normalizedKey → [{ scope, actionId }]
  // Recalcula cuando overrides/debugEnabled cambian.
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

function topScope() {
  // Devuelve scope con mayor precedencia (ultimo pushed). Global se evalua como fallback.
  return _scopeStack[_scopeStack.length - 1];
}

function actionsForKey(e) {
  const k = normalizeKey(e.key);
  return _keyMap.get(k) ?? [];
}

function dispatch(e) {
  const candidates = actionsForKey(e);
  if (candidates.length === 0) return false;

  // Resolver scope: top-down. Primero el scope mas alto que tenga handler.
  const stack = _scopeStack;
  for (let i = stack.length - 1; i >= 0; i--) {
    const scope = stack[i];
    const handlers = _handlers.get(scope);
    if (!handlers) continue;
    for (const actionId of candidates) {
      const def = ACTIONS[actionId];
      if (!def) continue;
      // Verificar que action aplica a este scope (o '*').
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
  // Si el foco esta en un input/textarea editable, no interceptar nada.
  // Permite tipear, borrar, navegar dentro de formularios (auth, name editor, etc.).
  if (isEditableTarget(e.target)) return;
  const consumed = dispatch(e);
  if (consumed) {
    if (normalizeKey(e.key) === 'Escape') playSfx('menuBack.press', 0.6);
    e.preventDefault();
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
    _scopeStack.push(SCOPES.GLOBAL);
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

  pushScope(scope) {
    if (!Object.values(SCOPES).includes(scope)) {
      console.warn(`[KeybindService] scope desconocido: ${scope}`);
      return;
    }
    _scopeStack.push(scope);
  },

  popScope(scope) {
    // Si scope dado, popea hasta encontrarlo (evita estado roto).
    if (scope) {
      const idx = _scopeStack.lastIndexOf(scope);
      if (idx > 0) _scopeStack.splice(idx, 1);
      return;
    }
    if (_scopeStack.length > 1) _scopeStack.pop();
  },

  setScope(scope) {
    // Reemplaza el top del stack (preserva global base).
    if (!Object.values(SCOPES).includes(scope)) return;
    if (_scopeStack.length === 1) _scopeStack.push(scope);
    else _scopeStack[_scopeStack.length - 1] = scope;
  },

  getScopes() { return [..._scopeStack]; },

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
