// Catálogo central de tipos de evento — UI ↔ Motor
// NUNCA usar strings literales fuera de este archivo

export const EventTypes = {
  // --- Input ---
  KEY_TYPED:          'key:typed',
  KEY_BACKSPACE:      'key:backspace',
  INPUT_CLEARED:      'input:cleared',
  DEBUG_FORCE_PLAYER_DEATH: 'debug:force_player_death',
  PERFORMANCE_TOGGLE:  'debug:performance_toggle',

  // --- Lexicon / Palabras ---
  WORD_PROGRESS:      'word:progress',     // { word, typed, correct }
  WORD_COMPLETED:     'word:completed',    // { word, wpm, accuracy }
  WORD_FAILED:        'word:failed',       // { word, typed }
  TARGET_CHANGED:     'target:changed',    // { enemyId, word }

  // --- Enemigos ---
  ENEMY_SPAWNED:      'enemy:spawned',     // { id, word, position }
  ENEMY_COLLAPSED:    'enemy:collapsed',   // { id, word }
  ENEMY_REACHED:      'enemy:reached',     // { id }

  // --- Jugador ---
  PLAYER_HIT:           'player:hit',        // { damage }
  PLAYER_DIED:          'player:died',
  PLAYER_STATS:         'player:stats',      // { hp, energy }
  PLAYER_OVERHEAT_START: 'player:overheat_start',
  PLAYER_OVERHEAT_END:   'player:overheat_end',
  PLAYER_RESOURCE_UPDATE: 'player:resource_update', // telemetría: { hull, shield, lexHeat }

  // --- HUD / UI ---
  HUD_UPDATE:         'hud:update',
  WARNING_CHANGED:    'warning:changed',

  // --- Juego ---
  GAME_START:         'game:start',        // { mode }
  GAME_PAUSE:         'game:pause',
  GAME_RESUME:        'game:resume',
  GAME_OVER:          'game:over',         // { score, wpm, accuracy }
  WAVE_START:         'wave:start',        // { waveNumber }
  WAVE_COMPLETE:      'wave:complete',
  COMBAT_COUNTDOWN_START: 'combat:countdown_start',
  COMBAT_COUNTDOWN_TICK:  'combat:countdown_tick',
  COMBAT_COUNTDOWN_END:   'combat:countdown_end',

  // --- Carrera ---
  RACE_COMPLETED:        'race:completed',
  RACE_FAILED:           'race:failed',
  RACE_PHRASE_COMPLETED: 'race:phrase_completed',

  // --- Flow ---
  FLOW_PROGRESS:   'flow:progress',    // { value, active }
  FLOW_ENTER:      'flow:enter',       // { wpm }
  FLOW_EXIT:       'flow:exit',        // { duration, wordsTyped }
  FLOW_HEAL:       'flow:heal',        // { amount, hp }

  // --- Seleccion de nave ---
  SHIP_SELECTION_OPENED:    'ship:selection_opened',
  SHIP_FOCUS_CHANGED:       'ship:focus_changed',       // { shipId }
  SHIP_CONFIRMED:           'ship:confirmed',            // { shipId }
  SHIP_SELECTION_CANCELLED: 'ship:selection_cancelled',

  // --- Economía ---
  GRAFEMAS_AWARDED:  'grafemas:awarded',   // { amount, source, breakdown }
  GRAFEMAS_SPENT:    'grafemas:spent',     // { amount, reason }
  SHIP_PURCHASED:    'ship:purchased',     // { shipId, price }
  SHIP_EQUIPPED:     'ship:equipped',      // { shipId }
  PROFILE_UPDATED:   'profile:updated',    // { profile }
  PROFILE_RESET:     'profile:reset',
  CHARACTER_SELECTED: 'character:selected', // { characterId }

  // --- Navegación in-app desde pause ---
  EXIT_TO_MENU:      'app:exit_to_menu',
  EXIT_TO_HANGAR:    'app:exit_to_hangar',   // { mode }

  // --- Sistema ---
  SCENE_READY:        'scene:ready',
  ASSETS_LOADED:      'assets:loaded',

  // --- Carga ---
  LOADING_PROGRESS: 'loading:progress',  // { progress, message, stage }
  LOADING_COMPLETE: 'loading:complete',  // { mode }

  // --- Deployment / Tutorial ---
  DEPLOYMENT_ANIMATION_COMPLETE: 'deployment:animation_complete', // { mode }
  HANGAR_READY:                  'hangar:ready',
  START_COUNTDOWN:               'countdown:start_request',       // { mode }
  TUTORIAL_STARTED:              'tutorial:started',              // { id }
  TUTORIAL_STEP_CHANGED:         'tutorial:step_changed',         // { id, step }
  TUTORIAL_COMPLETED:            'tutorial:completed',            // { id }
  TUTORIAL_SKIPPED:              'tutorial:skipped',              // { id, atStep }
};
