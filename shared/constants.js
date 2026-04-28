// Constantes globales del juego — ajustar aquí afecta todo el balance

export const GAME_MODES = {
  COMBAT: 'combat',
  RACING: 'racing',
};


// --- Carga ---
export const LOADING_STAGES = {
  INIT:     'INICIALIZANDO SISTEMAS LEXICOS',
  GEOMETRY: 'CONSTRUYENDO GEOMETRIA DEL ENJAMBRE',
  SCENE:    'CARGANDO ENTORNO ESPACIAL',
  WARMUP:   'COMPILANDO SHADERS · CALENTANDO MOTOR',
  READY:    'ENTRANDO AL CAMPO DE BATALLA',
};

export const ASSET_MANIFESTS = {
  shared: [
    { type: 'gltf', url: '/models/truth_about_the_dark_side_of_the_moon.glb', optional: true },
  ],
  combat: [
    { type: 'gltf', url: '/models/spaceshipnew.glb',              optional: true },
    { type: 'gltf', url: '/models/radiation_of_space.glb',        optional: true },
  ],
  racing: [
    { type: 'gltf', url: '/models/spaceship.glb',                              optional: true },
    { type: 'gltf', url: '/models/spaceship__low_poly.glb',                    optional: true },
    { type: 'gltf', url: '/models/24_dizzying_space_travel_-_inktober2019.glb', optional: true },
  ],
};

// --- WPM y timing ---
export const WPM_WINDOW_MS = 5000;
export const WPM_MIN_CHARS  = 5;
export const WORDS_PER_MINUTE_SCALE = 12;

// --- Combate ---
export const ENEMY_BASE_SPEED   = 2.0;
export const ENEMY_SPEED_SCALE  = 0.12;
export const MAX_ACTIVE_ENEMIES = 12;
export const WAVE_INTERVAL_MS   = 5000;
export const WORD_ERROR_PENALTY = 'reset';

// --- Jugador ---
export const PLAYER_MAX_HP     = 100;
export const PLAYER_MAX_ENERGY = 100;
export const PLAYER_MAX_SHIELD = 100; // alias semántico para PLAYER_MAX_ENERGY
export const HIT_DAMAGE        = 20;

// --- WARNINGS ---
export const WARN_PROXIMITY_YELLOW_M = 35;
export const WARN_PROXIMITY_RED_M    = 20;
export const WARN_HP_YELLOW_PCT      = 0.40;
export const WARN_HP_RED_PCT         = 0.20;
export const WARN_HP_HYSTERESIS      = 0.05;
export const WARN_DEBUG              = false;

// --- LEX-HEAT ---
export const LEX_HEAT_MAX          = 100;
export const LEX_HEAT_ON_MISTAKE   = 6;    // por error de tipeo
export const LEX_HEAT_ON_HIT       = 14;   // por enemigo que alcanza al jugador
export const LEX_HEAT_DECAY_PER_SEC = 7;   // enfriamiento pasivo por segundo
export const OVERHEAT_THRESHOLD    = 85;   // nivel que activa overheat
export const OVERHEAT_DURATION_SEC = 3.5;  // duración del estado overheat

// --- SHIELD ---
export const SHIELD_REGEN_PER_SEC  = 12;   // regeneración por segundo
export const SHIELD_REGEN_DELAY_MS = 1600; // ms sin daño antes de regen

// --- Rendering ---
export const CAMERA_FOV    = 75;
export const CAMERA_NEAR   = 0.1;
export const CAMERA_FAR    = 1000;
export const BLOOM_LAYER   = 1;

// --- Carrera ---
export const RACE_TARGET_DISTANCE = 500;
export const RACE_TIME_LIMIT      = 90;
export const RACE_OPPONENT_WPM    = 25;
export const RACE_PHRASE_COUNT    = 16;
export const RACE_DURATION        = 60;
export const RACE_COUNTDOWN_SECS  = 5;
// [minStreak, multiplier]
export const FLOW_STEPS = [[0,1.0],[5,1.2],[10,1.4],[15,1.6],[20,2.0]];

// Frases narrativas del universo BABEL — cada una es un array de palabras
export const PHRASE_POOL_ES = [
  ['las', 'palabras', 'no', 'se', 'acaban'],
  ['solo', 'cambian', 'de', 'mano'],
  ['el', 'enjambre', 'lexical', 'avanza'],
  ['escribe', 'antes', 'de', 'que', 'lleguen'],
  ['cada', 'glifo', 'es', 'un', 'escudo'],
  ['el', 'flujo', 'nunca', 'miente'],
  ['sintaxis', 'sobre', 'el', 'caos'],
  ['kael', 'voss', 'no', 'retrocede'],
  ['el', 'nodo', 'central', 'colapsa'],
  ['lyra', 'voss', 'transmite', 'aun'],
  ['babel', 'fue', 'un', 'error'],
  ['el', 'patron', 'se', 'repite'],
  ['nexolang', 'no', 'puede', 'contenerte'],
  ['la', 'precision', 'es', 'el', 'arma'],
  ['pulso', 'y', 'vector', 'se', 'alinean'],
  ['escribe', 'o', 'perece'],
];

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


// --- Racing material presets — same PBR baseline, different emissive tint ---
export const RACING_MATERIALS = {
  PLAYER: {
    metalness: 0.72, roughness: 0.22,
    emissiveR: 0.22, emissiveG: 0.12, emissiveB: 0.03,
    emissiveIntensity: 0.9,
  },
  OPPONENT: {
    metalness: 0.28, roughness: 0.52,
    emissiveR: 0.30, emissiveG: 0.04, emissiveB: 0.02,
    emissiveIntensity: 0.28,
  },
};

if (typeof globalThis !== 'undefined') {
  globalThis.RACING_MATERIALS = RACING_MATERIALS;
}

// Palabras cortas (<=5 chars) — early waves
export const WORD_POOL_SHORT = [
  'eco', 'red', 'eje', 'ion', 'arco', 'neo', 'sol', 'era', 'fin', 'lex',
  'bit', 'luz', 'hilo', 'byte', 'nodo', 'typo', 'kael', 'voss', 'lyra', 'glifo',
  'nexo', 'pulso', 'cifra', 'datos', 'babel', 'flujo', 'senal', 'campo', 'forma', 'piloto',
];

// Palabras medias (6-8 chars) — mid waves
export const WORD_POOL_MEDIUM = [
  'vector', 'umbral', 'patron', 'codigo', 'lexico', 'espectro', 'nebulosa', 'colapso',
  'guardian', 'lenguaje', 'escritor', 'sintaxis', 'enjambre', 'nexolang', 'cifrado',
  'impulso', 'enlace', 'receptor', 'cargador', 'impacto', 'fractura', 'circuito',
  'vortice', 'balizaje', 'palabra',
];

// Palabras largas (9+ chars) — late waves
export const WORD_POOL_LONG = [
  'algoritmo', 'resonancia', 'convergencia', 'modulacion', 'transmision', 'frecuencia',
  'protocolo', 'secuencia', 'centinela', 'estructura', 'fragmento', 'interferencia',
  'lexicograma', 'singularidad', 'codificacion', 'perturbacion', 'dissonancia',
];

// Pool completo — union de todos los tiers
export const WORD_POOL_ES = [
  ...WORD_POOL_SHORT,
  ...WORD_POOL_MEDIUM,
  ...WORD_POOL_LONG,
];

// --- Spawn Director ---
export const SPAWN_BUDGET_BASE          = 1.50;
export const SPAWN_BUDGET_WAVE_FACTOR   = 0.45;
export const SPAWN_BUDGET_SKILL_FACTOR  = 0.55;
export const SPAWN_BUDGET_DANGER_FACTOR = 0.45;
export const SPAWN_MIN_BUDGET           = 1.2;
export const SPAWN_MAX_BUDGET           = 10.0;
export const SPAWN_COMPOSITION_JITTER   = 0.08;
export const SPAWN_REPEAT_PENALTY       = 0.45;
export const SPAWN_RARE_PITY_STEP       = 0.06;
export const SPAWN_RARE_PITY_MAX        = 0.24;
export const SPAWN_MIN_WEIGHT_SCOUT     = 0.18;
export const SPAWN_MIN_WEIGHT_SENTINEL  = 0.14;
export const SPAWN_MIN_WEIGHT_GUARDIAN  = 0.10;
export const SPAWN_MIN_WEIGHT_PHANTOM   = 0.10;
export const SPAWN_MIN_WEIGHT_APEX      = 0.06;
export const SPAWN_MAX_WEIGHT_APEX      = 0.16;
export const SPAWN_RARE_PITY_THRESHOLD  = 4;
