// Catálogo central de tipos de evento — UI ↔ Motor
// NUNCA usar strings literales fuera de este archivo

export const EventTypes = {
  // --- Input ---
  KEY_TYPED:          'key:typed',
  KEY_BACKSPACE:      'key:backspace',
  INPUT_CLEARED:      'input:cleared',

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

  // --- Juego ---
  GAME_START:         'game:start',        // { mode }
  GAME_PAUSE:         'game:pause',
  GAME_RESUME:        'game:resume',
  GAME_OVER:          'game:over',         // { score, wpm, accuracy }
  WAVE_START:         'wave:start',        // { waveNumber }
  WAVE_COMPLETE:      'wave:complete',

  // --- Carrera ---
  RACE_COMPLETED:        'race:completed',
  RACE_FAILED:           'race:failed',
  RACE_PHRASE_COMPLETED: 'race:phrase_completed',

  // --- Sistema ---
  SCENE_READY:        'scene:ready',
  ASSETS_LOADED:      'assets:loaded',
};
