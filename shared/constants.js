// Constantes globales del juego — ajustar aquí afecta todo el balance

export const GAME_MODES = {
  COMBAT: 'combat',
  RACING: 'racing',
};

// --- WPM y timing ---
export const WPM_WINDOW_MS = 5000;
export const WPM_MIN_CHARS  = 5;
export const WORDS_PER_MINUTE_SCALE = 12;

// --- Combate ---
export const ENEMY_BASE_SPEED   = 1.5;
export const ENEMY_SPEED_SCALE  = 0.1;
export const MAX_ACTIVE_ENEMIES = 8;
export const WAVE_INTERVAL_MS   = 8000;
export const WORD_ERROR_PENALTY = 'reset';

// --- Jugador ---
export const PLAYER_MAX_HP     = 100;
export const PLAYER_MAX_ENERGY = 100;
export const HIT_DAMAGE        = 20;

// --- Rendering ---
export const CAMERA_FOV    = 75;
export const CAMERA_NEAR   = 0.1;
export const CAMERA_FAR    = 1000;
export const BLOOM_LAYER   = 1;

// --- Carrera ---
export const RACE_TARGET_DISTANCE = 500;
export const RACE_TIME_LIMIT      = 90;
export const RACE_OPPONENT_WPM    = 25;  // NPC opponent effective WPM
// [minStreak, multiplier]
export const FLOW_STEPS = [[0,1.0],[5,1.2],[10,1.4],[15,1.6],[20,2.0]];

// --- Colores del universo BABEL ---
export const COLORS = {
  BACKGROUND:       0x000000,
  PLAYER:           0x00ffcc,
  ENEMY:            0xff4466,
  ENEMY_TARGETED:   0xffcc00,
  WORD_CORRECT:     0x00ff88,
  WORD_INCORRECT:   0xff3333,
  WORD_PENDING:     0x888888,
  PARTICLE:         0x88aaff,
  HUD_PRIMARY:      '#00ffcc',
  HUD_DANGER:       '#ff4466',
  HUD_NEUTRAL:      '#888888',
};

export const WORD_POOL_ES = [
  'enjambre', 'lexico', 'babel', 'sintaxis', 'cifra', 'nexo',
  'patron', 'senal', 'umbral', 'vector', 'pulso', 'nodo',
  'codigo', 'glifo', 'forma', 'flujo', 'nexolang', 'typo',
  'lyra', 'kael', 'voss', 'piloto', 'escritor', 'palabra',
];
