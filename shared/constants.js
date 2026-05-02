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

// --- FLUJO·LEX ---
export const FLOW_MAX              = 100;
export const FLOW_GAIN_PER_LETTER  = 1.1;
export const FLOW_DECAY_IDLE       = 4;
export const FLOW_DECAY_ACTIVE     = 5;
export const FLOW_PENALTY_HIT      = 25;
export const FLOW_PENALTY_MISS     = 6;
export const FLOW_PENALTY_FAIL     = 15;
export const FLOW_HEAL_RATE        = 8;
export const FLOW_BEAM_DAMAGE_MULT = 2.5;
export const FLOW_COOLDOWN_MS      = 3000;
export const FLOW_BEAM_CHAIN       = 3;    // enemies hit per letter in flow mode

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
    rotationY: 0.77,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
  },
  {
    id: 'cb1',
    url: '/models/spaceship_-_cb1.glb',
    name: 'CB-1 Phantom',
    code: 'TYPO-CB1',
    rotationY: -Math.PI/2,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
  },
  {
    id: 'ig127',
    url: '/models/ig_127-730-00.glb',
    name: 'IG-127',
    code: 'TYPO-IG127',
    rotationY: -Math.PI,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
  },
  {
    id: 'lowpoly',
    url: '/models/spaceship__low_poly.glb',
    name: 'Forma Reducida',
    code: 'TYPO-FRD',
    rotationY: Math.PI,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
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
    rotationY: 0,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
  },
];
export const DEFAULT_SHIP = 'spaceship';

