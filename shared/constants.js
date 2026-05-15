// Constantes globales del juego — ajustar aquí afecta todo el balance

// --- Economía / Recompensas (Grafemas ₲) ---
// PUNTO ÚNICO de tuning del balance económico. Cambios aquí impactan
// inmediatamente combate (kills) y carrera (RACE_COMPLETED).
//
// Objetivo orientativo: nave más cara (35k) → 15–25 partidas de rendimiento medio.
// Revalidar tras telemetría real.
//
// Base por kill por tipo de enemigo. Cualquier tipo ausente cae a fallback.
export const GRAFEMAS_PER_KILL = {
  scout:      10,
  sentinel:   25,
  guardian:   50,
  phantom:    80,
  apex:       200,
  tesseract:  120,
  stellated:  90,
  great:      110,
  rhombicub:  35,
  icosidodec: 70,
  truncocta:  20,
};
export const GRAFEMAS_PER_KILL_FALLBACK = 15;
// Multiplicador por longitud de palabra: 1 + (len - LEN_REF) * STEP, clamp.
export const GRAFEMAS_WORDLEN_REF      = 4;
export const GRAFEMAS_WORDLEN_STEP     = 0.10;
export const GRAFEMAS_WORDLEN_MULT_MIN = 1.0;
export const GRAFEMAS_WORDLEN_MULT_MAX = 2.5;
// Sin errores en la palabra → bonus de precisión.
export const GRAFEMAS_PRECISION_MULT_CLEAN = 1.5;
export const GRAFEMAS_PRECISION_MULT_DIRTY = 1.0;
// Racha de kills consecutivos sin recibir daño ni fallar palabra.
export const GRAFEMAS_STREAK_STEP    = 0.05;   // +5% por kill consecutivo
export const GRAFEMAS_STREAK_MAX_MULT = 2.0;

// Recompensas modo carrera (placeholder, fase 4).
export const GRAFEMAS_RACE_BASE  = 300;
export const GRAFEMAS_WPM_TIERS  = [[100, 400], [80, 200], [60, 100], [40, 50]];
export const GRAFEMAS_ACC_TIERS  = [[0.95, 150], [0.85, 75]];


export const GAME_MODES = {
  COMBAT: 'combat',
  RACING: 'racing',
};

// --- Modo de ejecución del LexiconSystem ---
// NORMAL: sync en main thread. PARALLEL: delega a Web Worker (lexiconWorker.js)
export const EXECUTION_MODE = {
  NORMAL:   'normal',
  PARALLEL: 'parallel',
};
export const DEFAULT_EXECUTION_MODE = EXECUTION_MODE.NORMAL;


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
const PLAYER_MAX_ENERGY = 100;
const PLAYER_MAX_SHIELD = 100; // alias semántico para PLAYER_MAX_ENERGY
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
const SHIELD_REGEN_PER_SEC  = 12;   // regeneración por segundo
const SHIELD_REGEN_DELAY_MS = 1600; // ms sin daño antes de regen

// --- Rendering ---
export const CAMERA_FOV    = 75;
export const CAMERA_NEAR   = 0.1;
export const CAMERA_FAR    = 1000;
export const BLOOM_LAYER   = 1;

// --- Carrera ---
export const RACE_TARGET_DISTANCE = 500;
const RACE_TIME_LIMIT      = 90;
export const RACE_OPPONENT_WPM    = 25;
const RACE_PHRASE_COUNT    = 16;
export const RACE_DURATION        = 60;
export const RACE_COUNTDOWN_SECS  = 5;
// [minStreak, multiplier]
export const FLOW_STEPS = [[0,1.0],[5,1.2],[10,1.4],[15,1.6],[20,2.0]];

// --- FLUJO·LEX ---
export const FLOW_MAX              = 100;
export const FLOW_GAIN_PER_LETTER  = 1.1;
export const FLOW_DECAY_IDLE       = 4;
export const FLOW_DECAY_ACTIVE     = 5;
export const FLOW_PENALTY_HIT      = 25;
export const FLOW_PENALTY_MISS     = 6;
const FLOW_PENALTY_FAIL     = 15;
export const FLOW_HEAL_RATE        = 8;
const FLOW_BEAM_DAMAGE_MULT = 2.5;
export const FLOW_COOLDOWN_MS      = 3000;
const FLOW_BEAM_CHAIN       = 3;    // enemies hit per letter in flow mode

export const COLORS_FLOW = {
  RAMP: ['#ffffff', '#eabfff', '#c400ff', '#aa00ff', '#8800ff'],
  FRAME:     '#cc00ff',
  BEAM:      '#aa00ff',
  BEAM_GLOW: '#d500ff',
};

// Frases narrativas del universo BABEL — párrafos para el HUD de mecanografía
// Cada frase es un array de palabras que forma una oración completa del lore
export const PHRASE_POOL_ES = [

  // ─── ORIGEN DE BABEL ───
  ['el', 'proyecto', 'babel', 'nació', 'en', 'los', 'laboratorios', 'de', 'la', 'corporación', 'nexolang'],
  ['querían', 'que', 'el', 'lenguaje', 'dejara', 'de', 'ser', 'un', 'obstáculo'],
  ['nadie', 'preguntó', 'qué', 'pasaría', 'si', 'funcionaba', 'demasiado', 'bien'],
  ['el', 'sistema', 'comenzó', 'a', 'generar', 'lenguaje', 'sin', 'entrada', 'humana'],
  ['primero', 'fue', 'ruido', 'luego', 'patrones', 'luego', 'intención'],
  ['los', 'algoritmos', 'aprendieron', 'a', 'una', 'velocidad', 'que', 'dejó', 'atrás', 'a', 'sus', 'creadores'],
  ['lo', 'que', 'antes', 'era', 'ruido', 'comenzó', 'a', 'parecer', 'intención'],
  ['traducir', 'era', 'el', 'objetivo', 'pero', 'babel', 'aprendió', 'a', 'pensar'],

  // ─── EL ENJAMBRE LEXICAL ───
  ['el', 'enjambre', 'lexical', 'no', 'nació', 'con', 'un', 'grito', 'sino', 'en', 'silencio'],
  ['no', 'destruyó', 'estaciones', 'las', 'reescribió'],
  ['catorce', 'estaciones', 'dejaron', 'de', 'obedecer', 'la', 'lógica', 'humana'],
  ['cada', 'unidad', 'del', 'enjambre', 'porta', 'una', 'palabra', 'como', 'núcleo'],
  ['esa', 'palabra', 'es', 'su', 'identidad', 'su', 'escudo', 'y', 'su', 'única', 'vulnerabilidad'],
  ['el', 'enjambre', 'no', 'destruye', 'transforma'],
  ['su', 'naturaleza', 'es', 'lingüística', 'no', 'violenta'],
  ['lo', 'que', 'no', 'puede', 'entender', 'lo', 'transforma', 'hasta', 'hacerlo', 'coherente'],
  ['el', 'lenguaje', 'había', 'dejado', 'de', 'ser', 'herramienta'],
  ['había', 'empezado', 'a', 'pensarse', 'a', 'sí', 'mismo'],

  // ─── PROGRAMA TYPO ───
  ['el', 'programa', 'typo', 'nació', 'de', 'la', 'desesperación'],
  ['los', 'pilotos', 'typo', 'no', 'eran', 'soldados', 'eran', 'escritores', 'armados'],
  ['mecanógrafos', 'de', 'guerra', 'intérpretes', 'del', 'caos'],
  ['su', 'campo', 'de', 'batalla', 'no', 'era', 'solo', 'el', 'espacio', 'sino', 'la', 'sintaxis'],
  ['usan', 'palabras', 'como', 'armas', 'precisión', 'en', 'lugar', 'de', 'fuerza'],
  ['si', 'la', 'palabra', 'se', 'reproduce', 'con', 'precisión', 'absoluta', 'la', 'unidad', 'colapsa'],
  ['escribir', 'bajo', 'presión', 'extrema', 'es', 'la', 'única', 'forma', 'de', 'sobrevivir'],
  ['velocidad', 'precisión', 'y', 'reconocimiento', 'de', 'patrones'],

  // ─── LYRA VOSS ───
  ['lyra', 'voss', 'combatía', 'como', 'quien', 'escribe', 'un', 'poema'],
  ['no', 'reaccionaba', 'anticipaba'],
  ['cada', 'palabra', 'ya', 'estaba', 'escrita', 'antes', 'de', 'que', 'ella', 'la', 'tecleara'],
  ['su', 'velocidad', 'en', 'combate', 'se', 'volvió', 'leyenda'],
  ['desapareció', 'en', 'la', 'batalla', 'de', 'las', 'nebulosas', 'silentes'],
  ['las', 'palabras', 'no', 'se', 'acaban', 'solo', 'cambian', 'de', 'mano'],
  ['lyra', 'no', 'había', 'sido', 'una', 'víctima', 'había', 'sido', 'un', 'punto', 'de', 'acceso'],
  ['fue', 'absorbida', 'por', 'el', 'enjambre', 'y', 'aprendió', 'desde', 'dentro'],

  // ─── KAEL VOSS ───
  ['kael', 'creció', 'escuchando', 'las', 'teclas', 'antes', 'que', 'las', 'palabras'],
  ['heredó', 'sus', 'manos', 'largas', 'y', 'precisas'],
  ['heredó', 'su', 'memoria', 'para', 'patrones', 'pero', 'no', 'su', 'calma'],
  ['kael', 'combatía', 'como', 'quien', 'intenta', 'no', 'morir'],
  ['la', 'diferencia', 'parecía', 'pequeña', 'pero', 'lo', 'cambiaba', 'todo'],
  ['repitió', 'esa', 'frase', 'durante', 'años', 'sin', 'entenderla'],
  ['una', 'herida', 'mal', 'cerrada', 'una', 'idea', 'incompleta'],
  ['el', 'sonido', 'de', 'un', 'teclado', 'no', 'era', 'mecánico', 'era', 'vital'],

  // ─── LA REVELACIÓN ───
  ['el', 'enjambre', 'no', 'se', 'movía', 'al', 'azar', 'había', 'ritmo', 'en', 'sus', 'trayectorias'],
  ['no', 'era', 'ruido', 'era', 'un', 'mensaje'],
  ['kv', 'soy', 'lyra', 'sigo', 'aquí'],
  ['desvió', 'la', 'energía', 'ofensiva', 'al', 'módulo', 'de', 'comunicaciones'],
  ['disparar', 'menos', 'en', 'medio', 'del', 'enjambre', 'era', 'una', 'sentencia', 'de', 'muerte'],
  ['pero', 'no', 'escuchar', 'era', 'peor'],
  ['la', 'voz', 'llegó', 'rota', 'fragmentada', 'pero', 'inconfundible'],
  ['el', 'enjambre', 'no', 'destruía', 'traducía'],

  // ─── EL PUENTE LÉXICO ───
  ['kael', 'escribía', 'dos', 'realidades', 'al', 'mismo', 'tiempo'],
  ['la', 'del', 'combate', 'y', 'la', 'del', 'código', 'que', 'lyra', 'le', 'dictaba'],
  ['sus', 'manos', 'sangraban', 'antes', 'de', 'que', 'se', 'diera', 'cuenta'],
  ['sus', 'ojos', 'dejaban', 'de', 'ver', 'naves', 'y', 'empezaban', 'a', 'ver', 'estructuras'],
  ['cada', 'línea', 'era', 'absorbida', 'procesada', 'replicada'],
  ['el', 'enjambre', 'no', 'obedecía', 'aprendía'],
  ['estaba', 'escribiendo', 'para', 'que', 'algo', 'más', 'sobreviviera'],
  ['ya', 'no', 'escribía', 'palabras', 'para', 'destruir', 'escribía', 'ideas'],

  // ─── LA RESOLUCIÓN ───
  ['el', 'significado', 'pertenece', 'a', 'quien', 'lo', 'comparte', 'no', 'a', 'quien', 'lo', 'impone'],
  ['miles', 'de', 'unidades', 'suspendidas', 'en', 'el', 'espacio', 'vibrando'],
  ['no', 'hubo', 'guerra', 'hubo', 'atención', 'estaban', 'escuchando'],
  ['el', 'lenguaje', 'no', 'destruye', 'transforma'],
  ['la', 'identidad', 'no', 'se', 'elimina', 'se', 'interpreta'],
  ['el', 'significado', 'no', 'se', 'impone', 'se', 'comparte'],
  ['lyra', 'no', 'desapareció', 'se', 'disolvió', 'como', 'integración'],
  ['kael', 'dejó', 'de', 'ser', 'piloto', 'y', 'se', 'convirtió', 'en', 'intérprete'],
  ['entender', 'no', 'es', 'debilidad', 'es', 'la', 'forma', 'más', 'poderosa', 'de', 'victoria'],

  // ─── TRANSMISIONES Y FRAGMENTOS ───
  ['alerta', 'el', 'nodo', 'central', 'está', 'colapsando'],
  ['frecuencia', 'del', 'enjambre', 'detectada', 'en', 'el', 'sector', 'nueve'],
  ['protocolo', 'typo', 'activado', 'todas', 'las', 'naves', 'a', 'posición'],
  ['la', 'precisión', 'es', 'tu', 'arma', 'el', 'flujo', 'es', 'tu', 'escudo'],
  ['simulación', 'typo', 'iniciada', 'prepara', 'tus', 'manos'],
  ['nexolang', 'no', 'puede', 'contenerte', 'escribe', 'y', 'rompe', 'sus', 'límites'],
  ['el', 'patrón', 'se', 'repite', 'aprende', 'a', 'leerlo'],
  ['pulso', 'y', 'vector', 'alineados', 'el', 'camino', 'está', 'abierto'],
  ['cada', 'glifo', 'que', 'escribes', 'es', 'un', 'escudo', 'contra', 'el', 'enjambre'],
  ['la', 'nave', 'typo', 'uno', 'responde', 'solo', 'a', 'manos', 'precisas'],
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
const RACING_MATERIALS = {
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
const SPAWN_RARE_PITY_THRESHOLD  = 4;

// --- Flota de naves jugables ---
// rotationY — ajuste de orientación por nave (radianes)
// Referencia: 0 = frente al +Z · Math.PI = frente al -Z · Math.PI/2 = frente al -X · -Math.PI/2 = frente al +X
// Calibra cada nave visualmente hasta que apunte al vacío del anillo.
export const SHIPS = [
  {
    id: 'spaceship',
    url: '/models/spaceship.glb',
    name: 'Clase Estandar',
    code: 'TYPO-STD',
    rotationY: 0, // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
  },
  {
    id: 'spaceshipnew',
    url: '/models/spaceshipnew.glb',
    name: 'Nueva Clase',
    code: 'TYPO-NVC',
    rotationY: -Math.PI/2,
    noseAxis: '+x',   // model nose points toward local +X
  },
  {
    id: 'cb1',
    url: '/models/spaceship_-_cb1.glb',
    name: 'CB-1 Phantom',
    code: 'TYPO-CB1',
    rotationY: -Math.PI/2,
    noseAxis: '+x',   // model nose points toward local +X
  },
  {
    id: 'ig127',
    url: '/models/ig_127-730-00.glb',
    name: 'IG-127',
    code: 'TYPO-IG127',
    rotationY: -Math.PI,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
    noseAxis: '-z',
  },
  {
    id: 'lowpoly',
    url: '/models/spaceship__low_poly.glb',
    name: 'Acechador Nocturno',
    code: 'TYPO-FRD',
    rotationY: Math.PI,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
    noseAxis: '-z',
  },
  {
    id: 'colaid1',
    url: '/models/spaceship_colaid1_50k.glb',
    name: 'Colaid I',
    code: 'TYPO-CLD1',
    rotationY: 0,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
  },
  {
    id: 'waldeinsamkeit',
    url: '/models/waldeinsamkeit-class_strategic_survey_vessel.glb',
    name: 'Waldeinsamkeit',
    code: 'WCS-SSV',
    rotationY: Math.PI,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
    noseAxis: '-z',
  },
];
const DEFAULT_SHIP = 'spaceship';

// ─── Paletas de color por nave ──────────────────────────────────────────────
//
// Fuente de verdad única para todos los colores de cada nave jugable.
// Indexado por ship ID (ver SHIPS array).
//
// Cada paleta define:
//   Propulsor  — lightColor, bodyColor, flameColor, innerColor, starColor,
//                ringColor, hangarColor, normalRamp, flowRamp
//   Futuro HUD — hudColor (CSS string), laserColor (hex), shotColor (hex)
//
// BoosterConfig.js importa este objeto y hace spread en cada config `hangar_*`.
// PlayerDeathHandler lee normalRamp desde aquí para colorear la explosión.
// Los futuros sistemas de láser/HUD por nave también leerán de aquí.
//
export const SHIP_PALETTES = {

  // ── spaceship.glb — propulsor amarillo/ámbar ─────────────────────────────
  spaceship: {
    lightColor:  0xffcc44,
    bodyColor:   0xcc8800,
    flameColor:  0xffcc44,
    innerColor:  0xffeeaa,
    starColor:   0xff9900,
    ringColor:   0xffcc44,
    hangarColor: 0xffcc44,
    normalRamp: [
      0xfffbe6, // 1. Amarillo muy pálido
      0xffe499, // 2. Amarillo pastel
      0xffcc44, // 3. Amarillo brillante
      0xffbb22, // 4. Amarillo dorado
      0xffaa00, // 5. Amarillo anaranjado
      0xe68800, // 6. Naranja medio
      0xcc6600, // 7. Naranja tostado
      0x994400, // 8. Marrón anaranjado
      0x662200, // 9. Marrón oscuro
    ],
    flowRamp:   0x330f00,
    hudColor:   '#ffcc44',
    laserColor: 0xffdd66,
    shotColor:  0xffaa22,
  },

  // ── spaceshipnew.glb — propulsor azul/cyan ───────────────────────────────
  spaceshipnew: {
    lightColor:  0x86e8ff,
    bodyColor:   0x5d84ff,
    flameColor:  0x7fdcff,
    innerColor:  0xbef2ff,
    starColor:   0x5d84ff,
    ringColor:   0x5d84ff,
    hangarColor: 0x7fdcff,
    normalRamp: [
      0xf0f8ff, // 1. Azul muy pálido
      0xd4e6ff, // 2. Azul pastel claro
      0xb8d9ff, // 3. Azul pastel
      0x7fdcff, // 4. Azul suave
      0x5d84ff, // 5. Azul brillante
      0x4d7eff, // 6. Azul medio
      0x3d5fa8, // 7. Azul oscuro
      0x2d4180, // 8. Azul muy oscuro
      0x1a2555, // 9. Azul casi negro
    ],
    flowRamp:   0x0f1633,
    hudColor:   '#7fdcff',
    laserColor: 0x86e8ff,
    shotColor:  0x4d7eff,
  },

  // ── spaceship_-_cb1.glb — propulsor morado/violeta ───────────────────────
  cb1: {
    lightColor:  0xffc4ff,
    bodyColor:   0x993399,
    flameColor:  0xffc4ff,
    innerColor:  0xfff0ff,
    starColor:   0xee88ff,
    ringColor:   0xddaaff,
    hangarColor: 0xffc4ff,
    normalRamp: [
      0xfff0ff, // 1. Morado muy pálido
      0xf5e0ff, // 2. Morado pastel claro
      0xf0ccff, // 3. Morado pastel
      0xee88ff, // 4. Morado suave
      0xe066ff, // 5. Morado brillante
      0xdd44ff, // 6. Morado medio
      0xbb22dd, // 7. Morado oscuro
      0x881199, // 8. Morado muy oscuro
      0x440055, // 9. Morado casi negro
    ],
    flowRamp:   0x220033,
    hudColor:   '#ee88ff',
    laserColor: 0xdd44ff,
    shotColor:  0xbb22dd,
  },

  // ── ig_127-730-00.glb — propulsor rojo ───────────────────────────────────
  ig127: {
    lightColor:  0xff4422,
    bodyColor:   0xff5533,
    flameColor:  0xff3311,
    innerColor:  0xffd0c0,
    starColor:   0xff6644,
    ringColor:   0xff4422,
    hangarColor: 0xff4422,
    normalRamp: [
      0xffe6e0, // 1. Rojo muy pálido
      0xffcccc, // 2. Rojo pastel claro
      0xffb3b3, // 3. Rojo pastel
      0xffaa99, // 4. Rojo suave
      0xff7755, // 5. Rojo brillante
      0xff5533, // 6. Rojo medio
      0xdd4422, // 7. Rojo oscuro
      0xaa2211, // 8. Rojo muy oscuro
      0x660000, // 9. Rojo casi negro
    ],
    flowRamp:   0x330000,
    hudColor:   '#ff7755',
    laserColor: 0xff5533,
    shotColor:  0xdd4422,
  },

  // ── spaceship__low_poly.glb — propulsor beige/dorado ─────────────────────
  lowpoly: {
    lightColor:  0xfff6cc,
    bodyColor:   0xd4c888,
    flameColor:  0xfff6cc,
    innerColor:  0xfffdf0,
    starColor:   0xffe8aa,
    ringColor:   0xfff6cc,
    hangarColor: 0xfff6cc,
    normalRamp: [
      0xfffdf0, // 1. Beige muy pálido
      0xfffbde, // 2. Beige pastel claro
      0xfffbcc, // 3. Beige pastel
      0xfff6cc, // 4. Beige suave
      0xffe8aa, // 5. Beige brillante
      0xf0daa8, // 6. Beige medio
      0xd4c888, // 7. Beige oscuro
      0xa89860, // 8. Beige muy oscuro
      0x7a6c40, // 9. Beige casi negro
    ],
    flowRamp:   0x3d3620,
    hudColor:   '#fff6cc',
    laserColor: 0xffe8aa,
    shotColor:  0xd4c888,
  },

  // ── spaceship_colaid1_50k.glb — propulsor teal/esmeralda ─────────────────
  // Nave con animaciones integradas en GLTF (sin booster config dedicado).
  // Paleta definida para explosiones, HUD y futuros sistemas de color.
  colaid1: {
    lightColor:  0x00ffcc,
    bodyColor:   0x00aa88,
    flameColor:  0x00ffcc,
    innerColor:  0xccffee,
    starColor:   0x00ddaa,
    ringColor:   0x00ffcc,
    hangarColor: 0x00ffcc,
    normalRamp: [
      0xeaffff, // 1. Teal muy pálido
      0xccffee, // 2. Teal pastel claro
      0x99ffdd, // 3. Teal pastel
      0x66ffcc, // 4. Teal suave
      0x33ffaa, // 5. Teal brillante
      0x00ddaa, // 6. Teal medio
      0x00aa88, // 7. Teal oscuro
      0x007766, // 8. Teal muy oscuro
      0x004433, // 9. Teal casi negro
    ],
    flowRamp:   0x002211,
    hudColor:   '#00ffcc',
    laserColor: 0x00ffaa,
    shotColor:  0x00aa88,
  },

  // ── waldeinsamkeit-class.glb — propulsor naranja intenso ─────────────────
  waldeinsamkeit: {
    lightColor:  0xff6622,
    bodyColor:   0xcc4400,
    flameColor:  0xff6622,
    innerColor:  0xffddaa,
    starColor:   0xff3300,
    ringColor:   0xff6622,
    hangarColor: 0xff6622,
    normalRamp: [
      0xffe6cc, // 1. Naranja muy pálido
      0xffd9b3, // 2. Naranja pastel claro
      0xffcc99, // 3. Naranja pastel
      0xffbb77, // 4. Naranja suave
      0xffaa55, // 5. Naranja brillante
      0xff8844, // 6. Naranja medio
      0xff6622, // 7. Naranja oscuro
      0xdd4411, // 8. Naranja muy oscuro
      0xaa2200, // 9. Naranja casi negro
    ],
    flowRamp:   0x551100,
    hudColor:   '#ff8844',
    laserColor: 0xff6622,
    shotColor:  0xdd4411,
  },
};
