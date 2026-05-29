// Catalogo central de acciones + bindings por defecto.
// Una accion = una tecla canonica (mas alias opcional).
// Debug actions gated por playerProfile.debugEnabled.

export const SCOPES = Object.freeze({
  GLOBAL:   'global',
  MENU:     'menu',
  HANGAR:   'hangar',
  GAMEPLAY: 'gameplay',
  TUTORIAL: 'tutorial',
  MODAL:    'modal',
});

// Cada accion: { default, alias?, debug?, description, scopes }
// 'default' / 'alias' = KeyboardEvent.key normalizado (case-insensitive)
export const ACTIONS = Object.freeze({
  // ── Universal ─────────────────────────────────────────────────────
  CONFIRM:        { default: 'Enter',     alias: ' ',         scopes: ['menu','hangar','tutorial','modal'], description: 'keybindings.confirm.desc' },
  CANCEL:         { default: 'Escape',                        scopes: ['menu','hangar','tutorial','modal','gameplay'], description: 'keybindings.cancel.desc' },
  NAV_UP:         { default: 'ArrowUp',                       scopes: ['menu','modal','tutorial'],   description: 'keybindings.navUp.desc' },
  NAV_DOWN:       { default: 'ArrowDown',                     scopes: ['menu','modal','tutorial'],   description: 'keybindings.navDown.desc' },
  NAV_PREV:       { default: 'ArrowLeft',                     scopes: ['menu','hangar','tutorial','modal'], description: 'keybindings.navPrev.desc' },
  NAV_NEXT:       { default: 'ArrowRight',                    scopes: ['menu','hangar','tutorial','modal'], description: 'keybindings.navNext.desc' },
  SHOW_HELP:      { default: '?',                             scopes: ['*'],              description: 'keybindings.showHelp.desc' },

  // ── Hangar ────────────────────────────────────────────────────────
  HANGAR_CAM_CYCLE: { default: 'c',                           scopes: ['hangar'], description: 'keybindings.hangarCamCycle.desc' },
  HANGAR_CAM_RESET: { default: 'r',                           scopes: ['hangar'], description: 'keybindings.hangarCamReset.desc' },
  HANGAR_FIRE:      { default: 'k',                           scopes: ['hangar'], description: 'keybindings.hangarFire.desc' },
  HANGAR_LASER:     { default: 'l',                           scopes: ['hangar'], description: 'keybindings.hangarLaser.desc' },
  HANGAR_BOOSTERS:  { default: 'j',                           scopes: ['hangar'], description: 'keybindings.hangarBoosters.desc' },
  HANGAR_DETONATE:  { default: 'x',                           scopes: ['hangar'], description: 'keybindings.hangarDetonate.desc' },
  SELECT_PILOT:     { default: 'p',                           scopes: ['hangar'], description: 'keybindings.selectPilot.desc' },

  // ── Gameplay ──────────────────────────────────────────────────────
  // Typing es manejado aparte (cualquier caracter imprimible) — no registrado como action discreta.

  // ── Debug (solo si profile.debugEnabled) ──────────────────────────
  DEBUG_SCOPE_OVERLAY: { default: 'F8',         debug: true, scopes: ['*'], description: 'keybindings.debugScopeOverlay.desc' },
  DEBUG_PERF:        { default: 'F9',          debug: true, scopes: ['*'], description: 'keybindings.debugPerf.desc' },
  DEBUG_TELEMETRY:   { default: 'F10',         debug: true, scopes: ['*'], description: 'keybindings.debugTelemetry.desc' },
  DEBUG_BOT:         { default: 'F11',         debug: true, scopes: ['*'], description: 'keybindings.debugBot.desc' },
  DEBUG_MARKERS:     { default: 'F12',         debug: true, scopes: ['*'], description: 'keybindings.debugMarkers.desc' },
  DEBUG_RESET_TUT:   { default: 'Insert',      debug: true, scopes: ['*'], description: 'keybindings.debugResetTut.desc' },
  DEBUG_DEATH:       { default: 'Home',        debug: true, scopes: ['gameplay'], description: 'keybindings.debugDeath.desc' },
  DEBUG_SKIP_WAVE:   { default: 'End',         debug: true, scopes: ['gameplay'], description: 'keybindings.debugSkipWave.desc' },
  DEBUG_GRAF_PLUS:   { default: 'PageUp',      debug: true, scopes: ['*'], description: 'keybindings.debugGrafPlus.desc' },
  DEBUG_GRAF_MINUS:  { default: 'PageDown',    debug: true, scopes: ['*'], description: 'keybindings.debugGrafMinus.desc' },
  DEBUG_FREEZE:      { default: 'Pause',       debug: true, scopes: ['*'], description: 'keybindings.debugFreeze.desc' },
  DEBUG_WAVETRACE:   { default: 'ScrollLock',  debug: true, scopes: ['gameplay'], description: 'keybindings.debugWavetrace.desc' },
  DEBUG_SNAPSHOT:    { default: 'PrintScreen', debug: true, scopes: ['*'], description: 'keybindings.debugSnapshot.desc' },
});

// Normaliza una tecla para comparacion case-insensitive (letras unicas).
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
