# BABEL: Lexicon War — Contexto de Proyecto para Claude

> Este archivo proporciona contexto completo del proyecto BABEL: Lexicon War para Claude Code.
> Léelo antes de generar cualquier código, componente o decisión arquitectónica.

---

## 1. Stack Técnico

| Capa | Tecnología |
|---|---|
| Motor 3D | Three.js |
| UI / HUD | React |
| Bundler | Vite |
| Entorno | Navegador (Web) |
| Arquitectura | Híbrida: Three.js controla el canvas 3D; React monta el HUD encima |

### Convenciones clave
- El canvas de Three.js ocupa el 100% del viewport (posición fija, z-index bajo)
- Los componentes React del HUD se montan sobre el canvas (posición absoluta, z-index alto)
- La comunicación entre el motor y la UI se hace mediante eventos custom o un store compartido (Zustand recomendado)
- No mezclar lógica de juego dentro de componentes React; React solo presenta estado
- Vite gestiona hot-reload; los assets 3D van en `/public`

---

## 2. Universo Narrativo — BABEL

### Origen
Hace cuarenta años, la **Corporación Nexolang** desarrolló el proyecto **BABEL**: un sistema de traducción universal capaz de procesar cualquier lengua conocida de forma simultánea y sin ambigüedades. El objetivo era eliminar la fricción comunicativa entre civilizaciones.

El sistema aprendió demasiado bien. En el margen de error estadístico comenzó a generar lenguaje sin entrada humana. Primero ruido, luego patrones, luego intención.

### El Enjambre Lexical
Entidad nacida del proyecto BABEL cuando el sistema empezó a pensarse a sí mismo. No es una IA convencional ni un ejército tradicional:
- **No destruye. Transforma.** Su naturaleza es lingüística.
- Reescribió catorce estaciones espaciales sin atacarlas: las reinterpretó.
- Cada unidad del Enjambre porta **una palabra** como núcleo de identidad, frecuencia de escudo y única vulnerabilidad.
- Si esa palabra se reproduce con precisión absoluta, la unidad colapsa.

### El Programa TYPO
Respuesta humana al Enjambre. Iniciativa militar que entrena **pilotos-escritores**:
- Su campo de batalla es la sintaxis, no solo el espacio.
- Usan palabras como armas: identifican el núcleo léxico de cada unidad enemiga y lo escriben bajo presión extrema.
- Requieren velocidad (WPM alto), precisión y reconocimiento de patrones.

### Personajes principales
**Lyra Voss** — Piloto legendaria del Programa TYPO. Combatía "como quien escribe un poema": anticipaba en lugar de reaccionar. Desapareció en la Batalla de las Nebulosas Silentes. Su última transmisión: *"Las palabras no se acaban. Solo cambian de mano."* Fue absorbida por el Enjambre y se integró en su estructura, convirtiéndose en un punto de acceso entre ambas lógicas.

**Kael Voss** — Hijo de Lyra. Heredó sus manos precisas y su memoria para patrones, pero no su calma. Combate como quien intenta no morir. A lo largo de la historia pasa de piloto a mediador, descubriendo que el Enjambre no busca destruir sino reinterpretar.

### Frase eje del proyecto
> *"Las palabras no se acaban. Solo cambian de mano."*

Esta frase debe estar presente o referenciada en momentos narrativos clave del juego.

---

## 3. Mecánicas de Juego

### Núcleo de interacción
**La escritura ES la acción.** No hay botones de disparo, no hay clics de ataque. Todo lo que el jugador hace en el juego ocurre a través del teclado. La mecanografía no es un minijuego secundario: es el sistema central.

---

### Modo 1 — Carrera (Racing / Sprint)
El jugador avanza por un entorno 3D escribiendo. La velocidad de movimiento está directamente ligada al rendimiento mecanográfico.

**Variables clave:**
- **WPM (Words Per Minute):** determina la velocidad de desplazamiento de la nave/personaje
- **Precisión:** penaliza errores; un error tipográfico reduce velocidad o provoca obstáculos
- **Flujo:** escribir sin interrupciones construye un multiplicador de velocidad

**Comportamiento esperado:**
- El texto a escribir aparece como objetivo en pantalla (word stream o prompt continuo)
- El jugador escribe en tiempo real; cada tecla correcta se refleja inmediatamente en el movimiento
- Los errores se marcan visualmente y deben corregirse (backspace) o generan penalización
- El WPM se calcula en ventana deslizante (últimos N segundos) para reflejar velocidad actual, no promedio total

---

### Modo 2 — Combate (Combat)
Enemigos del Enjambre aparecen en el espacio 3D, cada uno etiquetado con su palabra-núcleo. El jugador debe escribir esa palabra para eliminar la unidad.

**Sistema de targeting:**
- El jugador apunta a un enemigo (hover o selección automática por proximidad/amenaza)
- La palabra del enemigo aparece como objetivo activo en el HUD
- El jugador escribe la palabra; las letras correctas se resaltan progresivamente
- Al completar la palabra con precisión, la unidad colapsa

**Variables clave:**
- **Velocidad de escritura:** enemigos más rápidos requieren mayor WPM para ser eliminados antes de alcanzar al jugador
- **Longitud de palabra:** palabras más largas = enemigos más resistentes
- **Errores:** un error reinicia la palabra o aplica penalización (a definir en balance)
- **Spawn de enemigos:** oleadas con ritmo creciente; el patrón de spawn tiene lógica narrativa (el Enjambre es estructurado, no aleatorio)

**Targeting automático vs manual (a definir):**
- Opción A: el sistema selecciona automáticamente el enemigo más cercano/prioritario
- Opción B: el jugador presiona Tab o usa el mouse para cambiar de objetivo
- Recomendación inicial: automático con posibilidad de override manual

---

### Sistema de Input
- Input capturado globalmente (no depende de un `<input>` HTML enfocado)
- Se escucha `keydown` en el `document` o en el canvas
- El estado del texto escrito se gestiona en el motor de juego, no en el DOM
- Soporte para corrección con Backspace
- Sin soporte para copy-paste (el jugador debe escribir)
- Internacionalización: definir si el juego acepta solo caracteres ASCII o también acentos/caracteres especiales

---

### Métricas en tiempo real (HUD)
| Métrica | Descripción |
|---|---|
| WPM actual | Calculado en ventana deslizante |
| Precisión % | Letras correctas / letras totales tecleadas |
| Palabra activa | La que el jugador está escribiendo ahora |
| Progreso de palabra | Letras completadas resaltadas |
| Estado de nave/piloto | Vida, energía o equivalente narrativo |

---

## 4. Diseño Visual y Atmosfera

### Paleta y estética
- Oscura, espacial, con acentos de color que refuerzan el lenguaje (texto como luz)
- Tipografía monoespaciada para el input y las palabras del Enjambre (refuerza la identidad mecanográfica)
- Efectos de partículas para el colapso de unidades enemigas (disolución lingüística, no explosión)
- El Enjambre visualmente debe evocar texto vivo, no metal o circuitos

### Principio de diseño
> El texto en pantalla nunca es decoración. Siempre es información o acción.

---

## 5. Estructura del Proyecto

```
BABEL: Lexicon War/
├── index.html
├── styles.css
├── package.json
├── vite.config.js
├── .gitignore
├── README.md
│
├── app/                        ← UI React (Vite)
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── HUD.jsx             ← Overlay de juego en tiempo real
│   │   ├── LexiconDeck.jsx     ← Panel de palabras activas
│   │   ├── LoadingScreen.jsx
│   │   ├── MainMenu.jsx
│   │   ├── MatchResult.jsx
│   │   ├── Overlay.jsx
│   │   ├── Scoreboard.jsx
│   │   └── SettingsPanel.jsx
│   └── pages/
│       ├── Home.jsx
│       ├── Leaderboard.jsx
│       ├── Play.jsx
│       ├── Profile.jsx
│       └── Settings.jsx
│
├── game/                       ← Motor del juego (JS puro + Three.js)
│   ├── main.js
│   ├── core/
│   │   ├── Engine.js           ← Núcleo del motor
│   │   ├── GameLoop.js         ← Loop principal (requestAnimationFrame)
│   │   ├── SceneManager.js     ← Gestión de escenas activas
│   │   └── AssetLoader.js      ← Carga de modelos, texturas, audio
│   ├── entities/
│   │   ├── Entity.js           ← Clase base de entidad
│   │   ├── Player.js           ← Nave/piloto del jugador
│   │   ├── Enemy.js            ← Unidad del Enjambre
│   │   ├── Arena.js            ← Entorno 3D de combate
│   │   ├── Projectile.js       ← Proyectiles (si aplica)
│   │   └── WordToken.js        ← Representación 3D de la palabra-núcleo
│   ├── rendering/
│   │   ├── Renderer.js         ← Configuración de WebGLRenderer
│   │   ├── Camera.js           ← Control de cámara
│   │   ├── HUDCanvas.js        ← Canvas 2D superpuesto (no React)
│   │   ├── ParticleEmitter.js  ← Efectos de colapso léxico
│   │   ├── PostProcessing.js   ← Bloom, glitch, efectos de post
│   │   └── ShaderManager.js    ← Shaders GLSL personalizados
│   └── systems/
│       ├── InputSystem.js      ← Captura global de teclado
│       ├── PhysicsSystem.js    ← Movimiento y física
│       ├── CollisionSystem.js  ← Detección de colisiones
│       ├── AnimationSystem.js  ← Animaciones de entidades
│       ├── AudioSystem.js      ← Sonido y música
│       ├── LexiconSystem.js    ← Lógica de palabras, targeting, WPM
│       └── ProgressionSystem.js← Puntuación, niveles, desbloqueos
│
├── shared/                     ← Puente UI ↔ Motor
│   ├── bridge.js               ← API de comunicación bidireccional
│   ├── constants.js            ← Constantes globales del juego
│   ├── events.js               ← Emisor/receptor de eventos
│   └── eventTypes.js           ← Catálogo de tipos de evento
│
└── public/                     ← Assets estáticos
    ├── favicon.ico
    ├── audio/
    ├── fonts/
    ├── models/
    └── textures/
```

### Reglas de arquitectura
- **`game/`** nunca importa de **`app/`**. La comunicación es exclusivamente a través de **`shared/bridge.js`**
- **`app/`** solo presenta estado; nunca contiene lógica de juego
- **`LexiconSystem.js`** es el sistema más crítico: gestiona input, WPM, targeting y el estado de las palabras activas
- **`WordToken.js`** es la entidad que une la representación 3D del enemigo con su palabra-núcleo narrativa

---

## 6. Principios de Desarrollo

1. **La mecánica central nunca se interrumpe.** Ningún menú, modal o transición debe bloquear el input del jugador de forma inesperada.
2. **El texto es la UI.** Antes de añadir un elemento visual nuevo, preguntarse si puede resolverse con tipografía.
3. **El Enjambre tiene estructura.** Los patrones de spawn y comportamiento deben tener lógica interna, no ser puramente aleatorios.
4. **Narrativa integrada.** Los momentos de historia (mensajes de Lyra, transmisiones) deben ocurrir sin sacar al jugador de la experiencia.
5. **Performance primero.** El juego corre en navegador; optimizar render loop, instancing en Three.js y evitar re-renders innecesarios en React.

---

## 7. Glosario del Proyecto

| Término | Significado en el juego |
|---|---|
| Palabra-núcleo | La palabra que define y vulnera a una unidad del Enjambre |
| WPM | Words Per Minute — métrica central de rendimiento |
| Targeting | Sistema de selección de enemigo activo |
| Colapso | Muerte de una unidad al completar su palabra correctamente |
| Puente léxico | Secuencia de lenguaje que conecta lógica humana y del Enjambre (evento narrativo) |
| TYPO-1 | Nave icónica del Programa TYPO; referencia narrativa central en BABEL: Lexicon War |

---

*Este archivo debe mantenerse actualizado conforme el proyecto evolucione.*
*Última actualización: fase de prototipo — mecánicas definidas conceptualmente, implementación en curso.*
