// Contenido declarativo de tutoriales. Sin lógica de motor.
// Cada step: { title, body, highlight?, diagram?, ctaContinue?, ctaSkip? }
// diagram = { kind: 'keyboard'|'combat-intro'|'branch-typing'|'combat-objective'
//                  |'hud-statbars'|'lex-heat'|'flow-mode'|'proximity'|'waves'
//                  |'grafemas'|'countdown'|'racing-typing'|'distance'|'timer'
//                  |'phrase'|'opponent'|'wpm-acc'|'hangar-overview'|'hangar-slots'
//                  |'hangar-nav'|'posture'|'no-look'|'accuracy', ...props }

export const TUTORIALS = {
  combat: {
    id: 'combat',
    titleChip: 'TUTORIAL · COMBATE',
    steps: [
      {
        title: 'Bienvenido, piloto TYPO',
        body: 'El Enjambre Lexical se acerca. Cada unidad porta una palabra-núcleo. Tipearla con precisión = colapso. Tu teclado es tu arma.',
        diagram: { kind: 'combat-intro' },
      },
      {
        title: '¿Sabes mecanografía táctil?',
        body: 'Antes de pelear, asegúrate de saber qué dedo presiona qué tecla. Si nunca lo aprendiste, recomendamos verlo. Toma 2 minutos.',
        branch: { typing: 'Enséñame mecanografía', skip: 'Ya sé, continuar' },
        diagram: { kind: 'branch-typing' },
      },
      {
        title: 'Objetivo',
        body: 'Una palabra cuelga sobre cada enemigo. Escríbela exacto y la unidad colapsa. Si llega a tu nave, recibes daño.',
        diagram: { kind: 'combat-objective' },
      },
      {
        title: 'HP / Lex-Heat / Shield / Flow',
        body: 'Esquina inferior izquierda: tus stats. HP baja con golpes. Lex-Heat sube con errores. Shield amortigua. Flow recompensa precisión.',
        highlight: 'bottom-left',
        diagram: { kind: 'hud-statbars' },
      },
      {
        title: 'Lex-Heat — el sobrecalentamiento',
        body: 'Cada error suma 6, cada golpe enemigo suma 14. Al pasar 85, tu input se bloquea por 3.5 segundos. Respira y escribe limpio.',
        diagram: { kind: 'lex-heat' },
      },
      {
        title: 'Flow Mode',
        body: 'Escribir bien sube el Flow. En racha alta multiplica recompensa y te cura. Un error rompe la racha entera.',
        diagram: { kind: 'flow-mode' },
      },
      {
        title: 'Avisos de proximidad',
        body: 'Marco amarillo = enemigo cerca. Rojo = inminente o HP bajo. Prioriza el más cercano.',
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
        body: 'Cada kill da grafemas. La cartera vive arriba a la derecha. Cómpra naves nuevas en el hangar.',
        diagram: { kind: 'grafemas' },
      },
      {
        title: '¡A combatir!',
        body: 'Al cerrar este panel, comienza la cuenta regresiva. Las palabras no se acaban. Solo cambian de mano.',
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
        title: '¿Sabes mecanografía táctil?',
        body: 'La carrera premia la fluidez. Si nunca aprendiste a escribir sin mirar, recomendamos verlo. Toma 2 minutos.',
        branch: { typing: 'Enséñame mecanografía', skip: 'Ya sé, continuar' },
        diagram: { kind: 'branch-typing' },
      },
      {
        title: 'Distancia y meta',
        body: 'Barra lateral izquierda: distancia recorrida vs meta. Llega a 500 m antes del tiempo límite.',
        highlight: 'mid-left',
        diagram: { kind: 'distance' },
      },
      {
        title: 'Tiempo límite',
        body: 'Cronómetro arriba. 60 segundos. Timeout = derrota.',
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
        body: 'Centro inferior: el párrafo en curso. Tipea palabra por palabra. La nave avanza con cada letra.',
        highlight: 'bottom-center',
        diagram: { kind: 'phrase' },
      },
      {
        title: 'Oponente',
        body: 'Una nave rival escribe a 25 WPM constante. Si la superas, ganas espacio. Si te frenas, te alcanza.',
        diagram: { kind: 'opponent' },
      },
      {
        title: 'WPM y precisión',
        body: 'Esquina superior derecha: tus métricas en vivo. La precisión cuenta más que la velocidad.',
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
        body: 'Aquí guardas tus naves. Preview 3D al centro, arsenal a un costado, stats técnicas. Elige nave antes de cada misión.',
        diagram: { kind: 'hangar-overview' },
      },
      {
        title: 'Tu piloto',
        body: 'Elige a Kael o Voss desde el botón PILOTO. Sólo uno queda ACTIVO y se guarda. Su nombre y rol aparecen arriba-izquierda en combate, carrera y hangar.',
        diagram: { kind: 'hangar-slots' },
      },
      {
        title: 'Navegación',
        body: 'Flechas ←/→ para cambiar de nave. Enter para desplegar. Si tienes grafemas suficientes, puedes comprar nuevas.',
        ctaContinue: 'ENTENDIDO',
        diagram: { kind: 'hangar-nav' },
      },
    ],
  },

  typing: {
    id: 'typing',
    titleChip: 'MECANOGRAFÍA TÁCTIL',
    steps: [
      {
        title: 'Postura',
        body: 'Espalda recta, codos a 90°, muñecas neutras (no dobladas), pies planos en el suelo. Pantalla a la altura de los ojos.',
        diagram: { kind: 'posture' },
      },
      {
        title: 'Home Row',
        body: 'Tus dedos descansan sobre ASDF (izq) y JKL; (der). Pulgares sobre la barra espaciadora. F y J tienen un relieve — encuéntralo sin mirar.',
        diagram: { kind: 'keyboard', highlight: ['leftPinky','leftRing','leftMiddle','leftIndex','rightIndex','rightMiddle','rightRing','rightPinky'] },
      },
      {
        title: 'Mano izquierda',
        body: 'Meñique: A Q Z 1. Anular: S W X 2. Medio: D E C 3. Índice: F G R T V B 4 5.',
        diagram: { kind: 'keyboard', highlight: ['leftPinky','leftRing','leftMiddle','leftIndex'] },
      },
      {
        title: 'Mano derecha',
        body: 'Índice: J H U Y M N 6 7. Medio: K I , 8. Anular: L O . 9. Meñique: Ñ ; P 0 -.',
        diagram: { kind: 'keyboard', highlight: ['rightIndex','rightMiddle','rightRing','rightPinky'] },
      },
      {
        title: 'Pulgares',
        body: 'Solo barra espaciadora. Alterna según conveniencia. Nunca uses el índice para el espacio.',
        diagram: { kind: 'keyboard', highlight: ['leftThumb','rightThumb'] },
      },
      {
        title: 'No mires el teclado',
        body: 'La memoria muscular se construye solo al no mirar. Acepta cometer errores al inicio. Vuelve siempre a home row.',
        diagram: { kind: 'no-look' },
      },
      {
        title: 'Precisión > velocidad',
        body: 'No persigas WPM. Persigue accuracy. La velocidad sube sola cuando los errores bajan.',
        diagram: { kind: 'accuracy' },
      },
      {
        title: 'Mini práctica',
        body: 'Tipea: asdf jkl;  asdf jkl;  asdf jkl;',
        practice: 'asdf jkl; asdf jkl; asdf jkl;',
        diagram: { kind: 'practice' },
        ctaContinue: 'LISTO',
      },
    ],
  },
};

export function getTutorial(id) {
  return TUTORIALS[id] || null;
}
