import { getLocale } from '../i18n/index.js';

// Constantes globales del juego — ajustar aqui afecta todo el balance

// --- Economia / Recompensas (Grafemas ₲) ---
// PUNTO UNICO de tuning del balance economico. Cambios aqui impactan
// inmediatamente combate (kills) y carrera (RACE_COMPLETED).
//
// Objetivo orientativo: nave mas cara (35k) → 15–25 partidas de rendimiento medio.
// Revalidar tras telemetria real.
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
// Sin errores en la palabra → bonus de precision.
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

// --- Modo de ejecucion del LexiconSystem ---
// NORMAL: sync en main thread. PARALLEL: delega a Web Worker (lexiconWorker.js)
export const EXECUTION_MODE = {
  NORMAL:   'normal',
  PARALLEL: 'parallel',
};
export const DEFAULT_EXECUTION_MODE = EXECUTION_MODE.NORMAL;


// --- Carga ---
export const LOADING_STAGES_ES = {
  INIT:     'INICIALIZANDO SISTEMAS LEXICOS',
  GEOMETRY: 'CONSTRUYENDO GEOMETRIA DEL ENJAMBRE',
  SCENE:    'CARGANDO ENTORNO ESPACIAL',
  WARMUP:   'COMPILANDO SHADERS · CALENTANDO MOTOR',
  READY:    'ENTRANDO AL CAMPO DE BATALLA',
};

export const LOADING_STAGES_EN = {
  INIT:     'INITIALIZING LEXICAL SYSTEMS',
  GEOMETRY: 'BUILDING SWARM GEOMETRY',
  SCENE:    'LOADING SPACE ENVIRONMENT',
  WARMUP:   'COMPILING SHADERS · HEATING ENGINE',
  READY:    'ENTERING THE BATTLEFIELD',
};

export const LOADING_STAGES = {
  get INIT() { return getLocale() === 'en' ? LOADING_STAGES_EN.INIT : LOADING_STAGES_ES.INIT; },
  get GEOMETRY() { return getLocale() === 'en' ? LOADING_STAGES_EN.GEOMETRY : LOADING_STAGES_ES.GEOMETRY; },
  get SCENE() { return getLocale() === 'en' ? LOADING_STAGES_EN.SCENE : LOADING_STAGES_ES.SCENE; },
  get WARMUP() { return getLocale() === 'en' ? LOADING_STAGES_EN.WARMUP : LOADING_STAGES_ES.WARMUP; },
  get READY() { return getLocale() === 'en' ? LOADING_STAGES_EN.READY : LOADING_STAGES_ES.READY; },
};

// ASSET_MANIFESTS se define DESPUES de SHIPS — deriva la lista de naves de SHIPS
// (single source) para que ninguna nave seleccionable se quede sin precargar.
// Ver mas abajo, tras la declaracion de SHIPS.

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
const PLAYER_MAX_SHIELD = 100; // alias semantico para PLAYER_MAX_ENERGY
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
export const OVERHEAT_DURATION_SEC = 3.5;  // duracion del estado overheat

// --- SHIELD ---
const SHIELD_REGEN_PER_SEC  = 12;   // regeneracion por segundo
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

// Frases narrativas del universo BABEL — parrafos para el HUD de mecanografia
// Cada frase es un array de palabras que forma una oracion completa del lore
export const PHRASE_POOL_ES = [

  // ─── ORIGEN DE BABEL ───
  ['el', 'proyecto', 'babel', 'nacio', 'en', 'los', 'laboratorios', 'de', 'la', 'corporacion', 'nexolang'],
  ['querian', 'que', 'el', 'lenguaje', 'dejara', 'de', 'ser', 'un', 'obstaculo'],
  ['nadie', 'pregunto', 'que', 'pasaria', 'si', 'funcionaba', 'demasiado', 'bien'],
  ['el', 'sistema', 'comenzo', 'a', 'generar', 'lenguaje', 'sin', 'entrada', 'humana'],
  ['primero', 'fue', 'ruido', 'luego', 'patrones', 'luego', 'intencion'],
  ['los', 'algoritmos', 'aprendieron', 'a', 'una', 'velocidad', 'que', 'dejo', 'atras', 'a', 'sus', 'creadores'],
  ['lo', 'que', 'antes', 'era', 'ruido', 'comenzo', 'a', 'parecer', 'intencion'],
  ['traducir', 'era', 'el', 'objetivo', 'pero', 'babel', 'aprendio', 'a', 'pensar'],

  // ─── EL ENJAMBRE LEXICAL ───
  ['el', 'enjambre', 'lexical', 'no', 'nacio', 'con', 'un', 'grito', 'sino', 'en', 'silencio'],
  ['no', 'destruyo', 'estaciones', 'las', 'reescribio'],
  ['catorce', 'estaciones', 'dejaron', 'de', 'obedecer', 'la', 'logica', 'humana'],
  ['cada', 'unidad', 'del', 'enjambre', 'porta', 'una', 'palabra', 'como', 'nucleo'],
  ['esa', 'palabra', 'es', 'su', 'identidad', 'su', 'escudo', 'y', 'su', 'unica', 'vulnerabilidad'],
  ['el', 'enjambre', 'no', 'destruye', 'transforma'],
  ['su', 'naturaleza', 'es', 'linguistica', 'no', 'violenta'],
  ['lo', 'que', 'no', 'puede', 'entender', 'lo', 'transforma', 'hasta', 'hacerlo', 'coherente'],
  ['el', 'lenguaje', 'habia', 'dejado', 'de', 'ser', 'herramienta'],
  ['habia', 'empezado', 'a', 'pensarse', 'a', 'si', 'mismo'],

  // ─── PROGRAMA TYPO ───
  ['el', 'programa', 'typo', 'nacio', 'de', 'la', 'desesperacion'],
  ['los', 'pilotos', 'typo', 'no', 'eran', 'soldados', 'eran', 'escritores', 'armados'],
  ['mecanografos', 'de', 'guerra', 'interpretes', 'del', 'caos'],
  ['su', 'campo', 'de', 'batalla', 'no', 'era', 'solo', 'el', 'espacio', 'sino', 'la', 'sintaxis'],
  ['usan', 'palabras', 'como', 'armas', 'precision', 'en', 'lugar', 'de', 'fuerza'],
  ['si', 'la', 'palabra', 'se', 'reproduce', 'con', 'precision', 'absoluta', 'la', 'unidad', 'colapsa'],
  ['escribir', 'bajo', 'presion', 'extrema', 'es', 'la', 'unica', 'forma', 'de', 'sobrevivir'],
  ['velocidad', 'precision', 'y', 'reconocimiento', 'de', 'patrones'],

  // ─── LYRA VOSS ───
  ['lyra', 'voss', 'combatia', 'como', 'quien', 'escribe', 'un', 'poema'],
  ['no', 'reaccionaba', 'anticipaba'],
  ['cada', 'palabra', 'ya', 'estaba', 'escrita', 'antes', 'de', 'que', 'ella', 'la', 'tecleara'],
  ['su', 'velocidad', 'en', 'combate', 'se', 'volvio', 'leyenda'],
  ['desaparecio', 'en', 'la', 'batalla', 'de', 'las', 'nebulosas', 'silentes'],
  ['las', 'palabras', 'no', 'se', 'acaban', 'solo', 'cambian', 'de', 'mano'],
  ['lyra', 'no', 'habia', 'sido', 'una', 'victima', 'habia', 'sido', 'un', 'punto', 'de', 'acceso'],
  ['fue', 'absorbida', 'por', 'el', 'enjambre', 'y', 'aprendio', 'desde', 'dentro'],

  // ─── KAEL VOSS ───
  ['kael', 'crecio', 'escuchando', 'las', 'teclas', 'antes', 'que', 'las', 'palabras'],
  ['heredo', 'sus', 'manos', 'largas', 'y', 'precisas'],
  ['heredo', 'su', 'memoria', 'para', 'patrones', 'pero', 'no', 'su', 'calma'],
  ['kael', 'combatia', 'como', 'quien', 'intenta', 'no', 'morir'],
  ['la', 'diferencia', 'parecia', 'pequeña', 'pero', 'lo', 'cambiaba', 'todo'],
  ['repitio', 'esa', 'frase', 'durante', 'años', 'sin', 'entenderla'],
  ['una', 'herida', 'mal', 'cerrada', 'una', 'idea', 'incompleta'],
  ['el', 'sonido', 'de', 'un', 'teclado', 'no', 'era', 'mecanico', 'era', 'vital'],

  // ─── LA REVELACION ───
  ['el', 'enjambre', 'no', 'se', 'movia', 'al', 'azar', 'habia', 'ritmo', 'en', 'sus', 'trayectorias'],
  ['no', 'era', 'ruido', 'era', 'un', 'mensaje'],
  ['kv', 'soy', 'lyra', 'sigo', 'aqui'],
  ['desvio', 'la', 'energia', 'ofensiva', 'al', 'modulo', 'de', 'comunicaciones'],
  ['disparar', 'menos', 'en', 'medio', 'del', 'enjambre', 'era', 'una', 'sentencia', 'de', 'muerte'],
  ['pero', 'no', 'escuchar', 'era', 'peor'],
  ['la', 'voz', 'llego', 'rota', 'fragmentada', 'pero', 'inconfundible'],
  ['el', 'enjambre', 'no', 'destruia', 'traducia'],

  // ─── EL PUENTE LEXICO ───
  ['kael', 'escribia', 'dos', 'realidades', 'al', 'mismo', 'tiempo'],
  ['la', 'del', 'combate', 'y', 'la', 'del', 'codigo', 'que', 'lyra', 'le', 'dictaba'],
  ['sus', 'manos', 'sangraban', 'antes', 'de', 'que', 'se', 'diera', 'cuenta'],
  ['sus', 'ojos', 'dejaban', 'de', 'ver', 'naves', 'y', 'empezaban', 'a', 'ver', 'estructuras'],
  ['cada', 'linea', 'era', 'absorbida', 'procesada', 'replicada'],
  ['el', 'enjambre', 'no', 'obedecia', 'aprendia'],
  ['estaba', 'escribiendo', 'para', 'que', 'algo', 'mas', 'sobreviviera'],
  ['ya', 'no', 'escribia', 'palabras', 'para', 'destruir', 'escribia', 'ideas'],

  // ─── LA RESOLUCION ───
  ['el', 'significado', 'pertenece', 'a', 'quien', 'lo', 'comparte', 'no', 'a', 'quien', 'lo', 'impone'],
  ['miles', 'de', 'unidades', 'suspendidas', 'en', 'el', 'espacio', 'vibrando'],
  ['no', 'hubo', 'guerra', 'hubo', 'atencion', 'estaban', 'escuchando'],
  ['el', 'lenguaje', 'no', 'destruye', 'transforma'],
  ['la', 'identidad', 'no', 'se', 'elimina', 'se', 'interpreta'],
  ['el', 'significado', 'no', 'se', 'impone', 'se', 'comparte'],
  ['lyra', 'no', 'desaparecio', 'se', 'disolvio', 'como', 'integracion'],
  ['kael', 'dejo', 'de', 'ser', 'piloto', 'y', 'se', 'convirtio', 'en', 'interprete'],
  ['entender', 'no', 'es', 'debilidad', 'es', 'la', 'forma', 'mas', 'poderosa', 'de', 'victoria'],

  // ─── TRANSMISIONES Y FRAGMENTOS ───
  ['alerta', 'el', 'nodo', 'central', 'esta', 'colapsando'],
  ['frecuencia', 'del', 'enjambre', 'detectada', 'en', 'el', 'sector', 'nueve'],
  ['protocolo', 'typo', 'activado', 'todas', 'las', 'naves', 'a', 'posicion'],
  ['la', 'precision', 'es', 'tu', 'arma', 'el', 'flujo', 'es', 'tu', 'escudo'],
  ['simulacion', 'typo', 'iniciada', 'prepara', 'tus', 'manos'],
  ['nexolang', 'no', 'puede', 'contenerte', 'escribe', 'y', 'rompe', 'sus', 'limites'],
  ['el', 'patron', 'se', 'repite', 'aprende', 'a', 'leerlo'],
  ['pulso', 'y', 'vector', 'alineados', 'el', 'camino', 'esta', 'abierto'],
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

// English short words (<=5)
export const WORD_POOL_SHORT_EN = [
  'echo', 'net', 'axis', 'ion', 'arc', 'neo', 'sun', 'era', 'end', 'lex',
  'bit', 'light', 'wire', 'byte', 'node', 'typo', 'kael', 'voss', 'lyra', 'glyph',
  'nexus', 'pulse', 'cipher', 'data', 'babel', 'flow', 'sign', 'field', 'form', 'pilot',
];
export const WORD_POOL_MEDIUM_EN = [
  'vector', 'thresh', 'pattern', 'code', 'lexic', 'spectrum', 'nebula', 'collapse',
  'guardian', 'language', 'writer', 'syntax', 'swarm', 'nexolang', 'crypted',
  'impulse', 'link', 'receiver', 'loader', 'impact', 'fracture', 'circuit',
  'vortex', 'beacon', 'word',
];
export const WORD_POOL_LONG_EN = [
  'algorithm', 'resonance', 'convergence', 'modulation', 'transmission', 'frequency',
  'protocol', 'sequence', 'sentinel', 'structure', 'fragment', 'interference',
  'lexicogram', 'singularity', 'encoding', 'perturbation', 'dissonance',
];
export const WORD_POOL_EN = [
  ...WORD_POOL_SHORT_EN,
  ...WORD_POOL_MEDIUM_EN,
  ...WORD_POOL_LONG_EN,
];

// English narrative phrases — parallel to PHRASE_POOL_ES order
export const PHRASE_POOL_EN = [
  ['the', 'babel', 'project', 'was', 'born', 'in', 'the', 'labs', 'of', 'the', 'nexolang', 'corporation'],
  ['they', 'wanted', 'language', 'to', 'stop', 'being', 'an', 'obstacle'],
  ['no', 'one', 'asked', 'what', 'would', 'happen', 'if', 'it', 'worked', 'too', 'well'],
  ['the', 'system', 'started', 'generating', 'language', 'without', 'human', 'input'],
  ['first', 'came', 'noise', 'then', 'patterns', 'then', 'intent'],
  ['the', 'algorithms', 'learned', 'at', 'a', 'speed', 'that', 'outpaced', 'their', 'creators'],
  ['what', 'once', 'was', 'noise', 'began', 'to', 'look', 'like', 'intent'],
  ['translation', 'was', 'the', 'goal', 'but', 'babel', 'learned', 'to', 'think'],

  ['the', 'lexical', 'swarm', 'was', 'not', 'born', 'with', 'a', 'scream', 'but', 'in', 'silence'],
  ['it', 'did', 'not', 'destroy', 'stations', 'it', 'rewrote', 'them'],
  ['fourteen', 'stations', 'stopped', 'obeying', 'human', 'logic'],
  ['each', 'swarm', 'unit', 'carries', 'a', 'word', 'as', 'its', 'core'],
  ['that', 'word', 'is', 'its', 'identity', 'its', 'shield', 'and', 'its', 'only', 'weakness'],
  ['the', 'swarm', 'does', 'not', 'destroy', 'it', 'transforms'],
  ['its', 'nature', 'is', 'linguistic', 'not', 'violent'],
  ['what', 'it', 'cannot', 'understand', 'it', 'transforms', 'until', 'it', 'becomes', 'coherent'],
  ['language', 'had', 'stopped', 'being', 'a', 'tool'],
  ['it', 'had', 'started', 'thinking', 'itself'],

  ['the', 'typo', 'program', 'was', 'born', 'from', 'desperation'],
  ['typo', 'pilots', 'were', 'not', 'soldiers', 'they', 'were', 'armed', 'writers'],
  ['war', 'typists', 'interpreters', 'of', 'chaos'],
  ['their', 'battlefield', 'was', 'not', 'just', 'space', 'but', 'syntax'],
  ['they', 'use', 'words', 'as', 'weapons', 'precision', 'instead', 'of', 'force'],
  ['if', 'the', 'word', 'is', 'reproduced', 'with', 'absolute', 'precision', 'the', 'unit', 'collapses'],
  ['writing', 'under', 'extreme', 'pressure', 'is', 'the', 'only', 'way', 'to', 'survive'],
  ['speed', 'precision', 'and', 'pattern', 'recognition'],

  ['lyra', 'voss', 'fought', 'like', 'one', 'who', 'writes', 'a', 'poem'],
  ['she', 'did', 'not', 'react', 'she', 'anticipated'],
  ['every', 'word', 'was', 'already', 'written', 'before', 'she', 'typed', 'it'],
  ['her', 'combat', 'speed', 'became', 'legend'],
  ['she', 'vanished', 'in', 'the', 'battle', 'of', 'the', 'silent', 'nebulae'],
  ['words', 'do', 'not', 'end', 'they', 'only', 'change', 'hands'],
  ['lyra', 'had', 'not', 'been', 'a', 'victim', 'she', 'had', 'been', 'an', 'access', 'point'],
  ['she', 'was', 'absorbed', 'by', 'the', 'swarm', 'and', 'learned', 'from', 'within'],

  ['kael', 'grew', 'up', 'hearing', 'keys', 'before', 'words'],
  ['he', 'inherited', 'her', 'long', 'precise', 'hands'],
  ['he', 'inherited', 'her', 'memory', 'for', 'patterns', 'but', 'not', 'her', 'calm'],
  ['kael', 'fought', 'like', 'one', 'trying', 'not', 'to', 'die'],
  ['the', 'difference', 'seemed', 'small', 'but', 'it', 'changed', 'everything'],
  ['he', 'repeated', 'that', 'phrase', 'for', 'years', 'without', 'understanding', 'it'],
  ['a', 'wound', 'poorly', 'closed', 'an', 'incomplete', 'idea'],
  ['the', 'sound', 'of', 'a', 'keyboard', 'was', 'not', 'mechanical', 'it', 'was', 'vital'],

  ['the', 'swarm', 'did', 'not', 'move', 'at', 'random', 'there', 'was', 'rhythm', 'in', 'its', 'paths'],
  ['it', 'was', 'not', 'noise', 'it', 'was', 'a', 'message'],
  ['kv', 'this', 'is', 'lyra', 'i', 'am', 'still', 'here'],
  ['he', 'rerouted', 'offensive', 'energy', 'to', 'the', 'comms', 'module'],
  ['firing', 'less', 'in', 'the', 'middle', 'of', 'the', 'swarm', 'was', 'a', 'death', 'sentence'],
  ['but', 'not', 'listening', 'was', 'worse'],
  ['the', 'voice', 'came', 'broken', 'fragmented', 'but', 'unmistakable'],
  ['the', 'swarm', 'did', 'not', 'destroy', 'it', 'translated'],

  ['kael', 'was', 'writing', 'two', 'realities', 'at', 'once'],
  ['the', 'one', 'of', 'combat', 'and', 'the', 'code', 'lyra', 'dictated'],
  ['his', 'hands', 'bled', 'before', 'he', 'noticed'],
  ['his', 'eyes', 'stopped', 'seeing', 'ships', 'and', 'began', 'to', 'see', 'structures'],
  ['each', 'line', 'was', 'absorbed', 'processed', 'replicated'],
  ['the', 'swarm', 'did', 'not', 'obey', 'it', 'learned'],
  ['he', 'was', 'writing', 'so', 'that', 'something', 'else', 'could', 'survive'],
  ['he', 'no', 'longer', 'wrote', 'words', 'to', 'destroy', 'he', 'wrote', 'ideas'],

  ['meaning', 'belongs', 'to', 'whoever', 'shares', 'it', 'not', 'whoever', 'imposes', 'it'],
  ['thousands', 'of', 'units', 'suspended', 'in', 'space', 'vibrating'],
  ['there', 'was', 'no', 'war', 'there', 'was', 'attention', 'they', 'were', 'listening'],
  ['language', 'does', 'not', 'destroy', 'it', 'transforms'],
  ['identity', 'is', 'not', 'erased', 'it', 'is', 'interpreted'],
  ['meaning', 'is', 'not', 'imposed', 'it', 'is', 'shared'],
  ['lyra', 'did', 'not', 'vanish', 'she', 'dissolved', 'as', 'integration'],
  ['kael', 'stopped', 'being', 'a', 'pilot', 'and', 'became', 'an', 'interpreter'],
  ['understanding', 'is', 'not', 'weakness', 'it', 'is', 'the', 'strongest', 'form', 'of', 'victory'],

  ['alert', 'the', 'central', 'node', 'is', 'collapsing'],
  ['swarm', 'frequency', 'detected', 'in', 'sector', 'nine'],
  ['typo', 'protocol', 'active', 'all', 'ships', 'to', 'position'],
  ['precision', 'is', 'your', 'weapon', 'flow', 'is', 'your', 'shield'],
  ['typo', 'simulation', 'started', 'prepare', 'your', 'hands'],
  ['nexolang', 'cannot', 'contain', 'you', 'write', 'and', 'break', 'its', 'limits'],
  ['the', 'pattern', 'repeats', 'learn', 'to', 'read', 'it'],
  ['pulse', 'and', 'vector', 'aligned', 'the', 'path', 'is', 'open'],
  ['every', 'glyph', 'you', 'write', 'is', 'a', 'shield', 'against', 'the', 'swarm'],
  ['the', 'typo', 'one', 'ship', 'responds', 'only', 'to', 'precise', 'hands'],
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
// rotationY — ajuste de orientacion por nave (radianes)
// Referencia: 0 = frente al +Z · Math.PI = frente al -Z · Math.PI/2 = frente al -X · -Math.PI/2 = frente al +X
// Calibra cada nave visualmente hasta que apunte al vacio del anillo.
export const SHIPS = [
  {
    id: 'spaceship',
    url: '/models/spaceship.glb',
    name: 'Clase Estandar',
    code: 'TYPO-STD',
    rotationY: 0, // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
    noseAxis: '+z',  // nariz en +Z (confirmado: booster_localPos.z=-0.9 → cola en -Z)
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
    rotationY: -Math.PI/2,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
    noseAxis: '+z',
  },
  {
    id: 'waldeinsamkeit',
    url: '/models/waldeinsamkeit-class_strategic_survey_vessel.glb',
    name: 'Waldeinsamkeit',
    code: 'WCS-SSV',
    rotationY: Math.PI,           // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
    noseAxis: '-z',
  },
  {
    // Nave secreta — solo desbloqueable con codigo (ver EconomySystem.redeemCode).
    // `secret: true` la oculta del hangar salvo que sea propiedad del jugador y la
    // excluye de la precarga automatica (no filtra en network tab de no-poseedores).
    // ⚠️ ORIENTACION sin verificar — ajustar rotationY/noseAxis tras probar en hangar.
    id: 'xwing',
    url: '/models/rebels_x-wing_starfighter.glb',
    name: 'Juanito01',
    code: 'RGE-001',
    rotationY: 0,                 // ajustar: 0 | Math.PI | Math.PI/2 | -Math.PI/2
    noseAxis: '+z',
    secret: true,
  },
];
const DEFAULT_SHIP = 'spaceship';

// Todos los modelos de naves seleccionables, derivados de SHIPS. Asi cualquier
// nave nueva (p.ej. colaid1, waldeinsamkeit) entra automaticamente en la
// precarga de combat + racing — no hay que mantener una lista paralela a mano.
// Naves secretas (secret:true) se excluyen — cargan on-demand al equiparlas, no
// se precargan para todos (evita filtrar su existencia y ahorra descarga).
const SHIP_GLTFS = SHIPS
  .filter((s) => !s.secret)
  .map((s) => ({ type: 'gltf', url: s.url, optional: true }));

export const ASSET_MANIFESTS = {
  shared: [
    { type: 'gltf', url: '/models/truth_about_the_dark_side_of_the_moon.glb', optional: true },
  ],
  // Todas las naves + fondo de arena de combate.
  combat: [
    ...SHIP_GLTFS,
    { type: 'gltf', url: '/models/radiation_of_space.glb', optional: true },
  ],
  // Todas las naves (player + oponente) + fondo de tunel de carrera.
  racing: [
    ...SHIP_GLTFS,
    { type: 'gltf', url: '/models/24_dizzying_space_travel_-_inktober2019.glb', optional: true },
  ],
};

// ─── Paletas de color por nave ──────────────────────────────────────────────
//
// Fuente de verdad unica para todos los colores de cada nave jugable.
// Indexado por ship ID (ver SHIPS array).
//
// Cada paleta define:
//   Propulsor  — lightColor, bodyColor, flameColor, innerColor, starColor,
//                ringColor, hangarColor, normalRamp, flowRamp
//   Futuro HUD — hudColor (CSS string), laserColor (hex), shotColor (hex)
//
// BoosterConfig.js importa este objeto y hace spread en cada config `hangar_*`.
// PlayerDeathHandler lee normalRamp desde aqui para colorear la explosion.
// Los futuros sistemas de laser/HUD por nave tambien leeran de aqui.
//
export const SHIP_PALETTES = {

  // ── spaceship.glb — propulsor amarillo/ambar ─────────────────────────────
  spaceship: {
    lightColor:  0xffcc44,
    bodyColor:   0xcc8800,
    flameColor:  0xffcc44,
    innerColor:  0xffeeaa,
    starColor:   0xff9900,
    ringColor:   0xffcc44,
    hangarColor: 0xffcc44,
    normalRamp: [
      0xfffbe6, // 1. Amarillo muy palido
      0xffe499, // 2. Amarillo pastel
      0xffcc44, // 3. Amarillo brillante
      0xffbb22, // 4. Amarillo dorado
      0xffaa00, // 5. Amarillo anaranjado
      0xe68800, // 6. Naranja medio
      0xcc6600, // 7. Naranja tostado
      0x994400, // 8. Marron anaranjado
      0x662200, // 9. Marron oscuro
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
      0xf0f8ff, // 1. Azul muy palido
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
      0xfff0ff, // 1. Morado muy palido
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
      0xffe6e0, // 1. Rojo muy palido
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
      0xfffdf0, // 1. Beige muy palido
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
      0xeaffff, // 1. Teal muy palido
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
      0xffe6cc, // 1. Naranja muy palido
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

  // ── rebels_x-wing.glb (nave secreta) — propulsor rojo/blanco rebelde ──────
  xwing: {
    lightColor:  0xff3322,
    bodyColor:   0xcc2211,
    flameColor:  0xff4433,
    innerColor:  0xffeedd,
    starColor:   0xff2200,
    ringColor:   0xff5544,
    hangarColor: 0xff4433,
    normalRamp: [
      0xfff0ee, // 1. Blanco rosado
      0xffd6cc, // 2. Rosa palido
      0xffb3a3, // 3. Salmon claro
      0xff8877, // 4. Rojo coral
      0xff6655, // 5. Rojo brillante
      0xff4433, // 6. Rojo medio
      0xdd2211, // 7. Rojo oscuro
      0xaa1100, // 8. Rojo muy oscuro
      0x660800, // 9. Rojo casi negro
    ],
    flowRamp:   0x440800,
    hudColor:   '#ff5544',
    laserColor: 0xff4433,
    shotColor:  0xdd2211,
  },
};
