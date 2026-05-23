// Catálogo central de acciones + bindings por defecto.
// Una acción = una tecla canónica (más alias opcional).
// Debug actions gated por playerProfile.debugEnabled.

export const SCOPES = Object.freeze({
  GLOBAL:   'global',
  MENU:     'menu',
  HANGAR:   'hangar',
  GAMEPLAY: 'gameplay',
  TUTORIAL: 'tutorial',
  MODAL:    'modal',
});

// Cada acción: { default, alias?, debug?, description, scopes }
// 'default' / 'alias' = KeyboardEvent.key normalizado (case-insensitive)
export const ACTIONS = Object.freeze({
  // ── Universal ─────────────────────────────────────────────────────
  CONFIRM:        { default: 'Enter',     alias: ' ',         scopes: ['menu','hangar','tutorial','modal'], description: 'Confirmar / acción primaria' },
  CANCEL:         { default: 'Escape',                        scopes: ['menu','hangar','tutorial','modal','gameplay'], description: 'Cancelar / atrás / pausa' },
  NAV_UP:         { default: 'ArrowUp',                       scopes: ['menu','modal'],   description: 'Navegar arriba' },
  NAV_DOWN:       { default: 'ArrowDown',                     scopes: ['menu','modal'],   description: 'Navegar abajo' },
  NAV_PREV:       { default: 'ArrowLeft',                     scopes: ['menu','hangar','tutorial'], description: 'Anterior / izquierda' },
  NAV_NEXT:       { default: 'ArrowRight',                    scopes: ['menu','hangar','tutorial'], description: 'Siguiente / derecha' },
  SHOW_HELP:      { default: '?',                             scopes: ['*'],              description: 'Mostrar atajos' },

  // ── Hangar ────────────────────────────────────────────────────────
  HANGAR_CAM_CYCLE: { default: 'c',                           scopes: ['hangar'], description: 'Ciclar vistas de cámara' },
  HANGAR_CAM_RESET: { default: 'r',                           scopes: ['hangar'], description: 'Reset cámara' },

  // ── Gameplay ──────────────────────────────────────────────────────
  // Typing es manejado aparte (cualquier carácter imprimible) — no registrado como action discreta.

  // ── Debug (solo si profile.debugEnabled) ──────────────────────────
  DEBUG_PERF:        { default: 'F9',          debug: true, scopes: ['*'], description: 'Toggle modo rendimiento' },
  DEBUG_TELEMETRY:   { default: 'F10',         debug: true, scopes: ['*'], description: 'Toggle panel telemetría (FPS)' },
  DEBUG_BOT:         { default: 'F11',         debug: true, scopes: ['*'], description: 'Toggle AutoTyper bot' },
  DEBUG_MARKERS:     { default: 'F12',         debug: true, scopes: ['*'], description: 'Toggle markers debug (hangar)' },
  DEBUG_RESET_TUT:   { default: 'Insert',      debug: true, scopes: ['*'], description: 'Reset flags de tutoriales (sin reload)' },
  DEBUG_DEATH:       { default: 'Home',        debug: true, scopes: ['gameplay'], description: 'Forzar muerte del jugador' },
  DEBUG_SKIP_WAVE:   { default: 'End',         debug: true, scopes: ['gameplay'], description: 'Saltar a próxima oleada' },
  DEBUG_GRAF_PLUS:   { default: 'PageUp',      debug: true, scopes: ['*'], description: '+50 grafemas' },
  DEBUG_GRAF_MINUS:  { default: 'PageDown',    debug: true, scopes: ['*'], description: '-50 grafemas' },
  DEBUG_FREEZE:      { default: 'Pause',       debug: true, scopes: ['*'], description: 'Freeze hard del loop' },
  DEBUG_WAVETRACE:   { default: 'ScrollLock',  debug: true, scopes: ['gameplay'], description: 'Toggle wave-trace logger' },
  DEBUG_SNAPSHOT:    { default: 'PrintScreen', debug: true, scopes: ['*'], description: 'Volcar estado a consola' },
});

// Normaliza una tecla para comparación case-insensitive (letras únicas).
// Teclas especiales (Enter, ArrowUp, F9, etc.) se preservan tal cual.
export function normalizeKey(key) {
  if (!key) return '';
  if (key.length === 1) return key.toLowerCase();
  return key;
}

// Resuelve la tecla efectiva (override del perfil o default).
export function resolveBinding(actionId, overrides = {}) {
  const def = ACTIONS[actionId];
  if (!def) return null;
  const override = overrides[actionId];
  return {
    key:   normalizeKey(override ?? def.default),
    alias: def.alias ? normalizeKey(def.alias) : null,
    debug: !!def.debug,
    scopes: def.scopes,
    description: def.description,
  };
}

// Lista acciones aplicables a un scope (o todas si scope='*').
export function actionsForScope(scope, { includeDebug = false } = {}) {
  return Object.entries(ACTIONS)
    .filter(([, def]) => {
      if (def.debug && !includeDebug) return false;
      return def.scopes.includes('*') || def.scopes.includes(scope);
    })
    .map(([id]) => id);
}
