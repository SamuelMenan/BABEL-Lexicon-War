// Contenido declarativo de tutoriales. Sin logica de motor.
// Cada step: { title, body, highlight?, diagram?, ctaContinue?, ctaSkip? }
// diagram = { kind: 'keyboard'|'combat-intro'|'branch-typing'|'combat-objective'
//                  |'hp-bar'|'hud-statbars'|'lex-heat'|'flow-mode'|'proximity'|'waves'
//                  |'grafemas'|'countdown'|'racing-typing'|'distance'|'timer'
//                  |'phrase'|'opponent'|'wpm-acc'|'hangar-overview'|'hangar-slots'
//                  |'hangar-nav'|'posture'|'no-look'|'accuracy', ...props }

import { getLocale } from '../i18n/index.js';

const TUTORIAL_CONTENT_ES = {
  combat: {
    id: 'combat',
    titleChip: 'TUTORIAL · COMBATE',
    steps: [
      {
        title: 'Bienvenido, piloto TYPO',
        body: 'El Enjambre Lexical se acerca. Cada unidad porta una palabra-nucleo. Tipearla con precision = colapso. Tu teclado es tu arma.',
        diagram: { kind: 'combat-intro' },
      },
      {
        title: '¿Sabes mecanografia tactil?',
        body: 'Antes de pelear, asegurate de saber que dedo presiona que tecla. Si nunca lo aprendiste, recomendamos verlo. Toma 2 minutos.',
        branch: { typing: 'Enseñame mecanografia', skip: 'Ya se, continuar' },
        diagram: { kind: 'branch-typing' },
      },
      {
        title: 'Objetivo',
        body: 'Una palabra cuelga sobre cada enemigo. Escribela exacto y la unidad colapsa. Si llega a tu nave, recibes daño.',
        diagram: { kind: 'combat-objective' },
      },
      {
        title: 'HP / Flow',
        body: 'Esquina inferior izquierda: tus stats basicos. HP baja con golpes. Flow recompensa precision. Los sistemas de sobrecalentamiento y escudo quedan reservados para una futura version del tutorial.',
        highlight: 'bottom-left',
        diagram: { kind: 'hud-statbars' },
      },
      {
        title: 'HP',
        body: 'La barra de vida es tu HP. Se reduce cuando te golpean y, si llega a cero, pierdes la nave. Vigilala antes de dejar que los enemigos se acerquen demasiado.',
        highlight: 'bottom-left',
        diagram: { kind: 'hp-bar' },
      },
      {
        title: 'Flow Mode',
        body: 'Escribir bien sube el Flow. En racha alta multiplica recompensa y te cura. Un error rompe la racha entera.',
        diagram: { kind: 'flow-mode' },
      },
      {
        title: 'Avisos de proximidad',
        body: 'Marco amarillo = enemigo cerca. Rojo = inminente o HP bajo. Prioriza el mas cercano.',
        diagram: { kind: 'proximity' },
      },
      {
        title: 'Oleadas y puntaje',
        body: 'Esquina superior derecha: oleada actual y score. Cada oleada escala en cantidad y velocidad.',
        highlight: 'top-right',
        diagram: { kind: 'waves' },
      },
      {
        title: 'Grafemas (₲)',
        body: 'Cada kill da grafemas. La cartera vive arriba a la derecha. Compra naves nuevas en el hangar.',
        diagram: { kind: 'grafemas' },
      },
      {
        title: '¡A combatir!',
        body: 'Al cerrar este panel, comienza la cuenta regresiva. Error de sintaxis. Coincidencia fallida.',
        ctaContinue: 'EMPEZAR',
        diagram: { kind: 'countdown' },
      },
    ],
  },

  racing: {
    id: 'racing',
    titleChip: 'TUTORIAL · CARRERA',
    steps: [
      {
        title: 'Escribir = avanzar',
        body: 'En carrera no hay enemigos ni HP. Tu velocidad = tus WPM. Si te detienes, la nave se detiene. Errores frenan.',
        diagram: { kind: 'racing-typing' },
      },
      {
        title: '¿Sabes mecanografia tactil?',
        body: 'La carrera premia la fluidez. Si nunca aprendiste a escribir sin mirar, recomendamos verlo. Toma 2 minutos.',
        branch: { typing: 'Enseñame mecanografia', skip: 'Ya se, continuar' },
        diagram: { kind: 'branch-typing' },
      },
      {
        title: 'Distancia y meta',
        body: 'Barra lateral izquierda: distancia recorrida vs meta. Llega a 500 m antes del tiempo limite.',
        highlight: 'mid-left',
        diagram: { kind: 'distance' },
      },
      {
        title: 'Tiempo limite',
        body: 'Cronometro arriba. 60 segundos. Timeout = derrota.',
        highlight: 'top-center',
        diagram: { kind: 'timer' },
      },
      {
        title: 'Multiplicador de Flow',
        body: 'Cadena palabras sin errores y tu multiplicador sube hasta x2.0. Un error = vuelve a x1.0 al instante.',
        diagram: { kind: 'flow-mode' },
      },
      {
        title: 'Frase activa',
        body: 'Centro inferior: el parrafo en curso. Tipea palabra por palabra. La nave avanza con cada letra.',
        highlight: 'bottom-center',
        diagram: { kind: 'phrase' },
      },
      {
        title: 'Oponente',
        body: 'Una nave rival escribe a 25 WPM constante. Si la superas, ganas espacio. Si te frenas, te alcanza.',
        diagram: { kind: 'opponent' },
      },
      {
        title: 'WPM y precision',
        body: 'Esquina superior derecha: tus metricas en vivo. La precision cuenta mas que la velocidad.',
        diagram: { kind: 'wpm-acc' },
      },
      {
        title: '¡A correr!',
        body: 'Cierra este panel para iniciar la cuenta regresiva.',
        ctaContinue: 'EMPEZAR',
        diagram: { kind: 'countdown' },
      },
    ],
  },

  hangar: {
    id: 'hangar',
    titleChip: 'TUTORIAL · HANGAR',
    steps: [
      {
        title: 'Tu hangar',
        body: 'Aqui guardas tus naves. Preview 3D al centro, arsenal a un costado, stats tecnicas. Elige nave antes de cada mision.',
        diagram: { kind: 'hangar-overview' },
      },
      {
        title: 'Tu piloto',
        body: 'Elige a Kael o Voss desde el boton PILOTO. Solo uno queda ACTIVO y se guarda. Su nombre y rol aparecen arriba-izquierda en combate, carrera y hangar.',
        diagram: { kind: 'hangar-slots' },
      },
      {
        title: 'Navegacion',
        body: 'Flechas ←/→ para cambiar de nave. Enter para desplegar. Si tienes grafemas suficientes, puedes comprar nuevas.',
        ctaContinue: 'ENTENDIDO',
        diagram: { kind: 'hangar-nav' },
      },
    ],
  },

  typing: {
    id: 'typing',
    titleChip: 'MECANOGRAFIA TACTIL',
    steps: [
      {
        title: 'Postura',
        body: 'Espalda recta, codos a 90°, muñecas neutras (no dobladas), pies planos en el suelo. Pantalla a la altura de los ojos.',
        diagram: { kind: 'posture' },
      },
      {
        title: 'Home Row',
        body: 'Tus dedos descansan sobre ASDF (izq) y JKL; (der). Pulgares sobre la barra espaciadora. F y J tienen un relieve — encuentralo sin mirar.',
        diagram: { kind: 'keyboard', highlight: ['leftPinky','leftRing','leftMiddle','leftIndex','rightIndex','rightMiddle','rightRing','rightPinky'] },
      },
      {
        title: 'Mano izquierda',
        body: 'Meñique: A Q Z 1. Anular: S W X 2. Medio: D E C 3. Indice: F G R T V B 4 5.',
        diagram: { kind: 'keyboard', highlight: ['leftPinky','leftRing','leftMiddle','leftIndex'] },
      },
      {
        title: 'Mano derecha',
        body: 'Indice: J H U Y M N 6 7. Medio: K I , 8. Anular: L O . 9. Meñique: Ñ ; P 0 -.',
        diagram: { kind: 'keyboard', highlight: ['rightIndex','rightMiddle','rightRing','rightPinky'] },
      },
      {
        title: 'Pulgares',
        body: 'Solo barra espaciadora. Alterna segun conveniencia. Nunca uses el indice para el espacio.',
        diagram: { kind: 'keyboard', highlight: ['leftThumb','rightThumb'] },
      },
      {
        title: 'No mires el teclado',
        body: 'La memoria muscular se construye solo al no mirar. Acepta cometer errores al inicio. Vuelve siempre a home row.',
        diagram: { kind: 'no-look' },
      },
      {
        title: 'Precision > velocidad',
        body: 'No persigas WPM. Persigue accuracy. La velocidad sube sola cuando los errores bajan.',
        diagram: { kind: 'accuracy' },
      },
      {
        title: 'Mini practica',
        body: 'Tipea: asdf jkl;  asdf jkl;  asdf jkl;',
        practice: 'asdf jkl; asdf jkl; asdf jkl;',
        diagram: { kind: 'practice' },
        ctaContinue: 'LISTO',
      },
    ],
  },
};

const TUTORIAL_CONTENT_EN = {
  combat: {
    id: 'combat',
    titleChip: 'TUTORIAL · COMBAT',
    steps: [
      {
        title: 'Welcome, pilot TYPO',
        body: 'The Lexical Swarm approaches. Each unit carries a core-word. Typing it with accuracy = collapse. Your keyboard is your weapon.',
        diagram: { kind: 'combat-intro' },
      },
      {
        title: 'Do you know touch typing?',
        body: 'Before fighting, make sure you know which finger presses which key. If you never learned it, we recommend watching it. Takes 2 minutes.',
        branch: { typing: 'Teach me typing', skip: 'I know, continue' },
        diagram: { kind: 'branch-typing' },
      },
      {
        title: 'Objective',
        body: 'A word hangs over each enemy. Type it exactly and the unit collapses. If it reaches your ship, you take damage.',
        diagram: { kind: 'combat-objective' },
      },
      {
        title: 'HP / Flow',
        body: 'Bottom-left corner: your basic stats. HP decreases with hits. Flow rewards accuracy. Overheat and shield systems are reserved for a future tutorial version.',
        highlight: 'bottom-left',
        diagram: { kind: 'hud-statbars' },
      },
      {
        title: 'HP',
        body: 'The life bar is your HP. It decreases when you get hit, and if it reaches zero, you lose your ship. Watch it before letting enemies get too close.',
        highlight: 'bottom-left',
        diagram: { kind: 'hp-bar' },
      },
      {
        title: 'Flow Mode',
        body: 'Typing well increases Flow. A high streak multiplies rewards and heals you. A single mistake breaks the entire streak.',
        diagram: { kind: 'flow-mode' },
      },
      {
        title: 'Proximity alerts',
        body: 'Yellow frame = enemy nearby. Red = imminent or low HP. Prioritize the closest one.',
        diagram: { kind: 'proximity' },
      },
      {
        title: 'Waves and score',
        body: 'Top-right corner: current wave and score. Each wave scales in quantity and speed.',
        highlight: 'top-right',
        diagram: { kind: 'waves' },
      },
      {
        title: 'Graphemes (₲)',
        body: 'Each kill grants graphemes. Your wallet lives at the top right. Buy new ships in the hangar.',
        diagram: { kind: 'grafemas' },
      },
      {
        title: 'To combat!',
        body: 'Closing this panel starts the countdown. Syntax error. Match failed.',
        ctaContinue: 'START',
        diagram: { kind: 'countdown' },
      },
    ],
  },

  racing: {
    id: 'racing',
    titleChip: 'TUTORIAL · RACE',
    steps: [
      {
        title: 'Typing = Advance',
        body: 'In a race there are no enemies or HP. Your speed = your WPM. If you stop, the ship stops. Mistakes slow you down.',
        diagram: { kind: 'racing-typing' },
      },
      {
        title: 'Do you know touch typing?',
        body: 'Racing rewards fluidity. If you never learned to type without looking, we recommend watching this. Takes 2 minutes.',
        branch: { typing: 'Teach me typing', skip: 'I know, continue' },
        diagram: { kind: 'branch-typing' },
      },
      {
        title: 'Distance and goal',
        body: 'Left sidebar: distance covered vs goal. Reach 500 m before the time limit.',
        highlight: 'mid-left',
        diagram: { kind: 'distance' },
      },
      {
        title: 'Time limit',
        body: 'Timer on top. 60 seconds. Timeout = defeat.',
        highlight: 'top-center',
        diagram: { kind: 'timer' },
      },
      {
        title: 'Flow Multiplier',
        body: 'Chain words without mistakes and your multiplier rises up to x2.0. One mistake = returns to x1.0 instantly.',
        diagram: { kind: 'flow-mode' },
      },
      {
        title: 'Active phrase',
        body: 'Bottom center: the active paragraph. Type word by word. The ship advances with each letter.',
        highlight: 'bottom-center',
        diagram: { kind: 'phrase' },
      },
      {
        title: 'Opponent',
        body: 'A rival ship types at a constant 25 WPM. If you surpass it, you gain space. If you slow down, it catches up.',
        diagram: { kind: 'opponent' },
      },
      {
        title: 'WPM and accuracy',
        body: 'Top-right corner: your live metrics. Accuracy matters more than speed.',
        diagram: { kind: 'wpm-acc' },
      },
      {
        title: 'Race!',
        body: 'Close this panel to start the countdown.',
        ctaContinue: 'START',
        diagram: { kind: 'countdown' },
      },
    ],
  },

  hangar: {
    id: 'hangar',
    titleChip: 'TUTORIAL · HANGAR',
    steps: [
      {
        title: 'Your hangar',
        body: 'Here you store your ships. 3D preview in the center, arsenal on the side, technical stats. Choose a ship before each mission.',
        diagram: { kind: 'hangar-overview' },
      },
      {
        title: 'Your pilot',
        body: 'Choose Kael or Voss using the PILOT button. Only one remains ACTIVE and is saved. Their name and role appear at the top-left in combat, race, and hangar.',
        diagram: { kind: 'hangar-slots' },
      },
      {
        title: 'Navigation',
        body: 'Arrow keys ←/→ to change ships. Enter to deploy. If you have enough graphemes, you can buy new ones.',
        ctaContinue: 'UNDERSTOOD',
        diagram: { kind: 'hangar-nav' },
      },
    ],
  },

  typing: {
    id: 'typing',
    titleChip: 'TOUCH TYPING',
    steps: [
      {
        title: 'Posture',
        body: 'Straight back, elbows at 90°, neutral wrists (not bent), feet flat on the floor. Screen at eye level.',
        diagram: { kind: 'posture' },
      },
      {
        title: 'Home Row',
        body: 'Your fingers rest on ASDF (left) and JKL; (right). Thumbs on the spacebar. F and J have tactile bumps — find them without looking.',
        diagram: { kind: 'keyboard', highlight: ['leftPinky','leftRing','leftMiddle','leftIndex','rightIndex','rightMiddle','rightRing','rightPinky'] },
      },
      {
        title: 'Left hand',
        body: 'Pinky: A Q Z 1. Ring: S W X 2. Middle: D E C 3. Index: F G R T V B 4 5.',
        diagram: { kind: 'keyboard', highlight: ['leftPinky','leftRing','leftMiddle','leftIndex'] },
      },
      {
        title: 'Right hand',
        body: 'Index: J H U Y M N 6 7. Middle: K I , 8. Ring: L O . 9. Pinky: Ñ ; P 0 -.',
        diagram: { kind: 'keyboard', highlight: ['rightIndex','rightMiddle','rightRing','rightPinky'] },
      },
      {
        title: 'Thumbs',
        body: 'Spacebar only. Alternate as convenient. Never use your index finger for space.',
        diagram: { kind: 'keyboard', highlight: ['leftThumb','rightThumb'] },
      },
      {
        title: 'Do not look at the keyboard',
        body: 'Muscle memory is built only by not looking. Accept making mistakes at the start. Always return to the home row.',
        diagram: { kind: 'no-look' },
      },
      {
        title: 'Accuracy > Speed',
        body: 'Do not chase WPM. Chase accuracy. Speed increases naturally as errors decrease.',
        diagram: { kind: 'accuracy' },
      },
      {
        title: 'Mini practice',
        body: 'Type: asdf jkl;  asdf jkl;  asdf jkl;',
        practice: 'asdf jkl; asdf jkl; asdf jkl;',
        diagram: { kind: 'practice' },
        ctaContinue: 'READY',
      },
    ],
  },
};

export function getTutorialContent() {
  return getLocale() === 'en' ? TUTORIAL_CONTENT_EN : TUTORIAL_CONTENT_ES;
}

export const TUTORIALS = {
  get combat() { return getTutorialContent().combat; },
  get racing() { return getTutorialContent().racing; },
  get hangar() { return getTutorialContent().hangar; },
  get typing() { return getTutorialContent().typing; },
};

export function getTutorial(id) {
  return getTutorialContent()[id] || null;
}
