// Constantes globales del juego — ajustar aquí afecta todo el balance

export const GAME_MODES = {
  COMBAT: 'combat',
  RACING: 'racing',
};

// --- WPM y timing ---
export const WPM_WINDOW_MS = 5000;      // ventana deslizante para calcular WPM
export const WPM_MIN_CHARS  = 5;        // mínimo de chars para calcular WPM válido
export const WORDS_PER_MINUTE_SCALE = 12; // factor velocidad WPM → movimiento

// --- Combate ---
export const ENEMY_BASE_SPEED   = 1.5;  // unidades Three.js por segundo
export const ENEMY_SPEED_SCALE  = 0.1;  // incremento por oleada
export const MAX_ACTIVE_ENEMIES = 8;
export const WAVE_INTERVAL_MS   = 8000; // ms entre oleadas
export const WORD_ERROR_PENALTY = 'reset'; // 'reset' | 'penalize'

// --- Jugador ---
export const PLAYER_MAX_HP     = 100;
export const PLAYER_MAX_ENERGY = 100;
export const HIT_DAMAGE        = 20;

// --- Rendering ---
export const CAMERA_FOV    = 75;
export const CAMERA_NEAR   = 0.1;
export const CAMERA_FAR    = 1000;
export const BLOOM_LAYER   = 1;

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

// --- Palabras de prueba (pool inicial — sustituir por sistema de progresión) ---
export const WORD_POOL_ES = [
  'enjambre', 'léxico', 'babel', 'sintaxis', 'cifra', 'nexo',
  'patrón', 'señal', 'umbral', 'vector', 'pulso', 'nodo',
  'código', 'glifo', 'forma', 'flujo', 'nexolang', 'typo',
  'lyra', 'kael', 'voss', 'piloto', 'escritor', 'palabra',
];
