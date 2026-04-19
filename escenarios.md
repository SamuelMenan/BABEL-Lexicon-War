# Escenarios — BABEL: Lexicon War

## 1. Filosofía visual

Los escenarios de BABEL no son fondos decorativos: son **estados narrativos del universo**. A medida que Kael cambia, el espacio a su alrededor cambia. El nivel 1 se ve limpio porque es una mentira (un simulador). El nivel 6 se ve como texto vivo porque ya no es combate, es lenguaje.

Principio rector de `CLAUDE.md` que atraviesa todo este documento:
> *"El texto en pantalla nunca es decoración. Siempre es información o acción."*

Aplicado a escenarios, esto significa que cada elemento visual del fondo debe poder leerse como: (a) parte del sistema de juego, (b) información narrativa, o (c) textura atmosférica intencional. Nunca "relleno".

Y el principio complementario:
> *"El Enjambre visualmente debe evocar texto vivo, no metal o circuitos."*

Los enemigos nunca son naves con placas de armadura. Son **formas luminosas con palabra asociada**. La única materia dura en pantalla es la nave del jugador.

---

## 2. Paleta base (referencia del prototipo actual)

Los valores definidos en `shared/constants.js → COLORS` son la ley:

| Rol | Color | Hex |
|---|---|---|
| Fondo | Negro profundo azulado | `0x000008` |
| Jugador / HUD primario | Cian | `0x00ffcc` / `#00ffcc` |
| Enemigo estándar | Rojo coral | `0xff4466` |
| Enemigo targeted | Amarillo cálido | `0xffcc00` |
| Palabra correcta | Verde vivo | `0x00ff88` |
| Palabra incorrecta | Rojo error | `0xff3333` |
| Palabra pendiente | Gris neutro | `0x888888` |
| Partículas | Azul pálido | `0x88aaff` |
| HUD peligro | Rojo coral | `#ff4466` |

**Nuevos colores introducidos por escenarios** (propuesta, añadir a `COLORS` cuando se implementen):

| Rol | Color sugerido | Hex | Aparece en |
|---|---|---|---|
| Cuadrícula simulador | Cian apagado | `0x004444` | Nivel 1 |
| Nebulosa distante fría | Violeta-azul | `0x2a1a4a` | Nivel 2, 3 |
| Glifo ambiental | Cian tenue | `0x334466` | Nivel 3 |
| Glitch / ruptura | Magenta sucio | `0xcc3388` | Nivel 4 |
| Lyra (transmisión) | Ámbar cálido | `0xffb060` | Nivel 5, 6 |
| Puente léxico | Blanco cálido luminoso | `0xfff4dd` | Nivel 6 |

El ámbar de Lyra es deliberadamente **ajeno a la paleta fría del juego**. El jugador debe sentir que ese color **no pertenece** al sistema del Enjambre ni al de TYPO. Es una tercera voz.

---

## 3. Elementos comunes a todos los escenarios

### Nave del jugador
Triángulo cian luminoso con alas extendidas, núcleo esférico azul-claro en la base (tal como aparece en el prototipo actual). Posición fija en la parte inferior central del viewport en combate; punto de fuga en el centro durante carrera. Siempre es el elemento más sólido de la escena.

### HUD base
- **Top-left**: `WPM`, `ACC`, `WAVE` (o `DIST` en carrera). Tipografía monoespaciada, cian apagado para etiquetas, cian intenso para valores.
- **Top-right**: barra de HP horizontal cian.
- **Bottom-center**: caja `TARGET` con la palabra activa deletreada con espaciado amplio (p. ej. `n e x o`), y barra de progreso fina debajo.

### Partículas de fondo
Puntos cuadrados blancos/azules distribuidos en capas con parallax. La densidad y comportamiento varían por escenario, pero la **forma cuadrada pixelada** se conserva — es firma visual del juego.

### Colapso de enemigo
Disolución en partículas de texto: la palabra del enemigo se fragmenta en sus letras individuales, que vuelan hacia afuera desvaneciéndose. Nunca explota en esquirlas — se **descompone en lenguaje**.

---

## 4. Escenarios por nivel

### Escenario 1 — Simulador Cero

**Nivel asociado**: 1 (Combate)
**Estado narrativo**: Kael en entrenamiento. Todo es mentira controlada.

#### Atmósfera general
La estética del prototipo actual pero con una capa de artificialidad visible. El jugador debe notar, sin que se lo digan, que **esto no es espacio real**.

#### Fondo
- Negro profundo estándar (`0x000008`).
- **Cuadrícula 3D sutil** en el volumen de juego: líneas cian apagadas (`0x004444`) que se desvanecen hacia el horizonte. Apenas visible, como una rejilla de referencia.
- Sin nebulosas. Sin asteroides. Sin elementos naturales.
- Límites del volumen de juego apenas perceptibles: un cubo imaginario cuyos bordes parpadean muy ocasionalmente con líneas cian.

#### Partículas
Distribución **regular, casi matemática**. Los puntos cuadrados están alineados en una grilla perturbada, no dispersos orgánicamente como en el prototipo. Delata el origen sintético del entorno.

#### Enemigos
Estándar del prototipo (rojo coral, blob luminoso con palabra flotante) pero con un **outline cian de un píxel**, dándoles apariencia holográfica. Al colapsar, las partículas de letras se pixelan brevemente antes de desvanecerse (efecto "frame drop" intencional).

#### Elementos narrativos visibles
- Texto esquinero pequeño, siempre presente: `SIM // TYPO // v3.1 // CAL OK`. Fuente monoespaciada, cian apagado, alpha bajo.
- Durante la pantalla de carga del nivel: logo de TYPO y la frase *"Las palabras no se acaban. Solo cambian de mano."* como pie discreto.
- Al completar el nivel: secuencia breve de "desmontaje" del simulador — la cuadrícula se repliega, las partículas se reorganizan en una línea, fade a negro.

#### Cámara y movimiento
Cámara estática con micromovimientos ínfimos (respiración del piloto). Sin zoom, sin shake incluso ante impactos — refuerza el carácter controlado del simulador.

---

### Escenario 2 — Borde del Sector Halo

**Nivel asociado**: 2 (Carrera)
**Estado narrativo**: Primera patrulla real de Kael. Solo y lejos.

#### Atmósfera general
Contraste deliberado con el Nivel 1. Aquí el espacio **es** grande, **es** vacío, **es** irregular. La nave avanza a velocidad visible y la sensación dominante es soledad.

#### Fondo
- Negro estándar en primer plano.
- **Nebulosa lejana** en el horizonte: volumen difuso violeta-azul (`0x2a1a4a`) con bordes suaves. No interactiva, puramente atmosférica. Se mueve muy lentamente conforme avanza la nave (parallax profundo).
- Campo estelar **en capas de parallax**: al menos tres planos de partículas con velocidades diferentes. La capa más cercana pasa rápido; la más lejana casi inmóvil.

#### Partículas
- Distribución orgánica (no grilla). Densidad variable por zona.
- **Streaks de movimiento**: las partículas cercanas dejan un leve rastro en la dirección del desplazamiento. Intensidad del streak proporcional al WPM actual.
- Ocasionalmente, partículas más grandes (polvo, micrometeoritos) cruzan la escena en diagonal.

#### Enemigos
No hay combate. En lugar de enemigos, las **palabras llegan desde el punto de fuga** creciendo conforme se acercan, como si la nave las atravesara. Color gris neutro (`0x888888`) cuando entran, verde al completarse correctamente, rojo al fallar.

#### Elementos narrativos visibles
- Fragmentos de texto en los bordes de la pantalla: *transmisiones interceptadas* del Enjambre. Pequeños, monoespaciados, baja opacidad, aparecen y se desvanecen. Son decorativos **salvo** cuando coinciden con una palabra del flujo de carrera (guiño visual: "esto es lo que estás transcribiendo").
- Indicador de distancia estilo HUD militar: barra fina en el lateral derecho con marcas cada 100 unidades.

#### Cámara y movimiento
Cámara en primera persona ligera con balanceo orgánico. Aceleración visible al aumentar WPM (FOV se abre 2-3°). Al frenar, FOV se cierra. El efecto crea sensación de impulso directamente ligado a la escritura.

---

### Escenario 3 — Anillo de Repetición

**Nivel asociado**: 3 (Carrera)
**Estado narrativo**: Kael empieza a ver estructura en el ruido.

#### Atmósfera general
Idéntica al Nivel 2 en primera impresión, pero con capas adicionales que el jugador descubre gradualmente. Todo pulsa. Todo tiene ritmo.

#### Fondo
- Misma nebulosa violeta-azul, ahora **más presente y cercana**.
- **Glifos ambientales**: formas geométricas tenues (hexágonos, triángulos, líneas rectas) aparecen y desaparecen en las capas profundas del fondo, en cian tenue (`0x334466`). Muy sutiles. Nunca ocupan el foco.
- Los glifos **se repiten**: el jugador que presta atención verá que los mismos 3-4 patrones ciclan.

#### Partículas
- Las partículas más lejanas **pulsan sincronizadas** con el pool de palabras activo. No todas, solo las del plano más distante. Ritmo de aproximadamente 0.5-1 Hz, muy suave.
- Aparición ocasional de un "enjambre distante": cluster de puntos rojos muy lejos, vibrando sin atacar. El jugador los percibe pero no puede interactuar con ellos.

#### Enemigos
Sin combate. El flujo de palabras **se organiza en ciclos visibles**: grupos de 3-4 palabras que se repiten. Cuando una palabra aparece por segunda vez, detrás de ella aparece un **ghost tenue** de su instancia anterior, desplazado unos píxeles. Acumula eco: tercera repetición, ghost más marcado.

#### Elementos narrativos visibles
- En momentos específicos del nivel (cada ~30s), un **destello fugaz** ilumina los glifos ambientales durante medio segundo, revelando que forman una estructura mayor. Luego se disuelve.
- HUD gana un indicador discreto: `PAT ≈ 0.82` (patrón detectado, confianza). Es narrativo — el sistema de la nave de Kael está notando lo mismo que el jugador.

#### Cámara y movimiento
Igual al Nivel 2 pero con un micro-balanceo rítmico acompasado al pulso de las partículas. Muy sutil. Refuerza subconscientemente la idea de que todo está sincronizado.

---

### Escenario 4 — Fractura de Frecuencia

**Nivel asociado**: 4 (Combate)
**Estado narrativo**: El Enjambre ya no es aleatorio. Algo intenta comunicar.

#### Atmósfera general
Vuelta al combate, pero el espacio se siente **inestable**. No es solo que los enemigos sean más fuertes — el entorno mismo está reaccionando.

#### Fondo
- Negro profundo, más denso que en niveles anteriores.
- **Glitches visuales ocasionales**: franjas horizontales breves (100-300ms) donde el color se desplaza, se desatura, o aparece magenta sucio (`0xcc3388`). No son daños — son el entorno *dudando*.
- Sin nebulosas. El fondo es más claustrofóbico que los niveles de carrera.

#### Partículas
- Distribución tensa: zonas de alta densidad y zonas vacías, como si algo las organizara.
- **Micromovimientos coordinados**: grupos de partículas se desplazan juntos brevemente antes de dispersarse, sugiriendo inteligencia en el fondo.

#### Enemigos
- Mismos blobs rojos del prototipo, pero **llegan en formaciones geométricas deliberadas**: triángulos, líneas rectas, arcos simétricos. Jamás caóticos.
- Entre oleadas, las formaciones se disuelven y reconstruyen en el fondo, visibles como siluetas antes de activarse.
- **Enemigos élite**: visualmente distintos — más grandes, con **varias palabras orbitándolos lentamente** en lugar de una. Outline pulsante. Color rojo más saturado, tendiendo al blanco en el núcleo.
- Las formaciones progresivamente adquieren **formas casi-significantes**: una oleada tardía forma lo que parece una letra griega; otra, un símbolo geométrico que remite a los glifos del Nivel 3.

#### Elementos narrativos visibles
- En la oleada final, al eliminar al último enemigo, **el evento visual central del juego hasta este punto**:
	1. Pausa de 300ms donde todo el fondo se vuelve negro absoluto.
	2. Glitch masivo: la pantalla se pixela, se fractura en bandas horizontales, aparece ruido.
	3. El texto **`KV — SOY LYRA — SIGO AQUÍ`** se imprime a lo ancho de la pantalla en ámbar cálido (`0xffb060`), caracteres uno a uno, con latencia irregular entre letras.
	4. El texto se mantiene 2 segundos, luego se desvanece junto con el glitch.
	5. Transición a pantalla de resultado.
- Este es el **primer uso del ámbar** en todo el juego. Debe sentirse como una intrusión.

#### Cámara y movimiento
Cámara con shake ligero constante (no por daño, sino por la tensión del entorno). Al aparecer cada enemigo élite, un pulso breve de cámara hacia atrás (dolly-out de 5%). En el evento final, la cámara se congela por completo.

---

### Escenario 5 — Canal Interferido

**Nivel asociado**: 5 (Híbrido)
**Estado narrativo**: Primer contacto sostenido con Lyra. Kael escribe dos realidades.

#### Atmósfera general
La pantalla se divide funcionalmente en dos campos visuales. El espacio principal sigue siendo combate (como Nivel 4), pero a un lado aparece un **canal nuevo** que no pertenece al resto del juego.

#### Composición de la pantalla
- **Campo principal** (~75% del ancho, a la izquierda): combate con Enjambre, idéntico a Nivel 4 en estética base pero menos glitch.
- **Canal Lyra** (~25% del ancho, columna derecha): panel vertical con fondo ligeramente más claro (`0x050512`), borde ámbar tenue, donde el texto de Lyra scrollea de abajo hacia arriba lentamente. Tipografía monoespaciada, color ámbar (`0xffb060`).
- Separador entre ambos: línea vertical ámbar apagada, de 1px, que **pulsa** cuando el jugador alterna correctamente entre canales.

#### Fondo del campo principal
- Negro profundo pero con **tinte cálido apenas perceptible** (+2% en canal rojo respecto al nivel 4). Es la influencia del ámbar filtrándose.
- Sin glitches de Nivel 4 — aquí el entorno está más estable, como si la presencia de Lyra lo ordenara.

#### Partículas
- En el campo principal: normales, distribución de combate.
- **Hilos de resonancia** (efecto de alternancia): cuando el jugador alterna correctamente entre combate y canal Lyra, aparecen **hebras luminosas cian** que van del enemigo targeted hacia el canal Lyra y de vuelta. Duran 400ms. Son el refuerzo visual del buff de resonancia (ver `niveles.md § Nivel 5`).

#### Enemigos
- Idénticos al Nivel 4 pero con **menor saturación de rojo**: un rojo apagado, casi marchito. Visualmente comunican que el Enjambre mismo está siendo reinterpretado por la presencia de Lyra.
- Al colapsar, sus letras en lugar de dispersarse al azar **vuelan hacia el canal Lyra** durante 200ms antes de desvanecerse. Sugiere que la muerte de cada enemigo alimenta el puente.

#### Canal Lyra (contenido visual)
- Texto scrolleando lento, no todo legible. Fragmentos como:
	- `kael`
	- `------- aquí -------`
	- `no destruyas`
	- `reconfigura`
	- `las palabras no se acaban`
- Cuando el jugador escribe en el canal Lyra, las letras ingresadas aparecen en **blanco cálido** brillante antes de asentarse en ámbar.
- Si el jugador ignora el canal demasiado tiempo, el texto **empieza a desvanecerse de arriba hacia abajo** (pérdida de progreso visual).

#### Elementos narrativos visibles
- Momento puntual a mitad del nivel: toda la pantalla se oscurece 200ms, y aparece el texto *"KAEL — ESTOY VIVA — NO COMO ANTES"* centrado en ámbar, durante 1.5s. Luego vuelve al estado normal.

#### Cámara y movimiento
Cámara ligeramente más cercana al jugador que en Nivel 4 (sensación de intimidad / claustrofobia). Al activarse la resonancia, un breve pulso de zoom-in (~3%) seguido de retorno.

---

### Escenario 6 — El Puente Léxico

**Nivel asociado**: 6 (Híbrido — Clímax)
**Estado narrativo**: Kael ya no combate. Escribe el puente. El universo del juego se reconfigura en tiempo real.

#### Atmósfera general
Este escenario **cambia durante el nivel**. Empieza parecido al Nivel 5 y termina en un estado visual completamente distinto a cualquier otro punto del juego. Es el único escenario con **transformación estructural en vivo**.

#### Fase 0 — Apertura (puente 0%)
- Composición similar a Nivel 5 pero con el canal Lyra ensanchado al 35% del ancho.
- Fondo del campo principal: negro con tinte ámbar más perceptible que en Nivel 5.
- Enemigos: densos, rápidos, saturación roja alta — el Enjambre que todavía no entiende.

#### Fase 1 — Primer hito (puente 25%)
- **Expansión del canal Lyra**: crece hasta ~45% del ancho.
- Los bordes entre ambos campos se difuminan — la línea separadora ámbar se vuelve un **gradiente suave** cian-a-ámbar.
- Dos enemigos en pantalla **colapsan voluntariamente** sin ser targeted: sus letras vuelan al canal Lyra y se integran al texto del puente.
- Partículas del fondo empiezan a tener un leve resplandor ámbar en sus bordes.

#### Fase 2 — Segundo hito (puente 50%)
- El canal Lyra alcanza el 55% del ancho. La frontera entre "combate" y "transmisión" ya no es clara.
- Los **enemigos restantes cambian de color**: su rojo se desatura progresivamente hacia un rosa pálido, luego hacia un gris cálido.
- En el fondo comienzan a aparecer **glifos grandes y luminosos**, similares a los del Nivel 3 pero ahora nítidos, formados por agrupaciones de partículas. Se leen como fragmentos de lenguaje.

#### Fase 3 — Tercer hito (puente 75%)
- El canal Lyra ocupa ~70% del ancho. El "combate" queda confinado a una franja lateral angosta.
- Los enemigos restantes son pocos, lentos, con palabras cortas. Ya no se sienten amenazantes — se sienten como rezagados.
- El fondo es ahora una **superposición de texto**: frases completas flotando en distintas profundidades, en blanco cálido (`0xfff4dd`), semi-transparentes. El jugador puede leer algunas: *"reinterpretar"*, *"umbral"*, *"compartir"*, *"significado"*, *"puente"*.
- Partículas del fondo: la mayoría han mutado a **puntos luminosos ámbar-blancos**, distribuidos densamente.

#### Fase 4 — Cierre (puente 100%)
- **Colapso voluntario de todos los enemigos restantes** a la vez. Sus letras vuelan al canal central (que ahora ocupa prácticamente toda la pantalla).
- El campo principal de combate desaparece. La nave del jugador se desplaza al centro del viewport.
- El espacio entero se llena de texto: capas y capas de palabras que antes estaban dispersas ahora se organizan en una estructura legible.
- Las partículas se reagrupan formando, en el fondo, **un enjambre que escribe**: miles de puntos luminosos moviéndose coordinadamente, formando y disolviendo palabras.
- La nave del jugador se ilumina intensamente, su silueta se vuelve casi blanca.
- **Momento final**: todo el texto del entorno se reorganiza gradualmente en una única frase, centrada, grande:
	> *"El significado pertenece a quien lo comparte, no a quien lo impone."*
- La frase permanece 4 segundos. Luego la escena se desvanece a negro lentamente, y sobre el negro aparece, en cian apagado, la frase-eje del proyecto:
	> *"Las palabras no se acaban. Solo cambian de mano."*

#### Cámara y movimiento
- Fases 0-2: cámara estable tipo combate.
- Fase 3: la cámara comienza un retroceso muy lento (dolly-out continuo).
- Fase 4: la cámara se detiene, se centra en la nave, y en los últimos segundos hace un zoom-in suavísimo hacia ella hasta que el jugador queda ocupando la mitad del viewport. El resto es texto rodeándolo.

---

## 5. Progresión visual transversal

Un cuadro de referencia rápida para quien implemente. Cada eje debe moverse **monótonamente** a lo largo de los 6 niveles, sin retrocesos (salvo los deliberados, marcados con `*`).

| Eje | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 | Nivel 5 | Nivel 6 |
|---|---|---|---|---|---|---|
| Saturación del rojo enemigo | Media (holo) | — | — | Alta | Media* | Baja → nula |
| Presencia de ámbar (Lyra) | 0% | 0% | 0% | 0% (solo final) | 25% | 25% → 100% |
| Densidad de elementos narrativos en fondo | Baja | Baja | Media | Alta | Media | Máxima |
| Estabilidad del entorno | Alta (rígida) | Alta | Alta (rítmica) | Baja (glitch) | Media | Transformación continua |
| Rol del texto en el fondo | Ninguno | Fragmentos | Glifos | Formaciones | Canal lateral | Todo es texto |
| Cámara | Estática | Orgánica suave | Rítmica | Shake | Intimista | Narrativa (retroceso + zoom) |

*El Nivel 5 baja deliberadamente la saturación del rojo para comunicar que Lyra está reinterpretando al Enjambre desde dentro.

---

## 6. Transiciones entre niveles

Las transiciones son el puente narrativo entre escenarios y deben respetar la continuidad.

- **1 → 2**: La cuadrícula del simulador se repliega hacia un punto central. Fade a negro. Desde el negro emerge el campo estelar real del Nivel 2, inicialmente estático, luego comenzando a fluir cuando el jugador aprieta la primera tecla.
- **2 → 3**: Sin corte visual. Tras pasar el checkpoint del Nivel 2, la cámara continúa pero la nebulosa se intensifica y aparecen los primeros glifos. Es la misma misión narrativa prolongada.
- **3 → 4**: Corte duro. El último glifo ambiental del Nivel 3 se congela en pantalla y se quiebra en esquirlas (efecto glitch). Fade a negro. El Nivel 4 abre con la primera oleada ya formándose.
- **4 → 5**: No hay transición limpia: el evento final del Nivel 4 (el mensaje `KV — SOY LYRA — SIGO AQUÍ`) **se sostiene** en pantalla durante la carga del Nivel 5. El escenario del Nivel 5 se construye alrededor de ese mensaje, que finalmente se desliza al canal Lyra lateral y se convierte en la primera línea legible del panel.
- **5 → 6**: El canal Lyra del Nivel 5, al completar el nivel, crece hasta ocupar toda la pantalla durante la transición, y desde ese ámbar total emerge el Nivel 6 en su Fase 0.

---

## 7. Notas de implementación

- Los escenarios deben vivir como **configuraciones declarativas**, no como escenas hardcodeadas. Propuesta: un archivo por escenario en `game/scenes/` (p. ej. `Scene_Simulator.js`, `Scene_HaloRim.js`, `Scene_Bridge.js`) que exponga `setup(scene)`, `update(dt)`, `teardown()`.
- Los elementos de fondo que pulsan, scrollean o reaccionan a eventos del juego deben suscribirse a `shared/events.js`. No deben tener estado propio desvinculado.
- Los nuevos colores propuestos (§ 2, segunda tabla) deben añadirse a `shared/constants.js → COLORS` **antes** de implementar cualquier escenario posterior al 1, para que la paleta esté centralizada.
- El canal Lyra del Nivel 5-6 requiere un renderer de texto scrolleable independiente del HUD. Propuesta: componente React aparte (`app/components/LyraChannel.jsx`) comunicado vía `shared/bridge.js`.
- La transformación del Nivel 6 (fases 0→4) debe implementarse como **interpolación de parámetros de escena** sobre el progreso del puente (0.0 → 1.0), no como cambios de escena discretos. Esto mantiene la sensación de transformación continua.
- Performance: los niveles 5 y 6 son los más exigentes visualmente (dos campos activos, partículas densas, texto múltiple). Instancing obligatorio para partículas; texto del puente usando atlas precalculado.

---

## 8. Criterios de éxito visual

Un escenario está bien implementado si un jugador, al verlo **sin HUD, sin palabras, sin jugador en pantalla**, puede decir:

- Nivel 1 → *"Esto es artificial. Hay reglas."*
- Nivel 2 → *"Estoy solo y hay mucho espacio."*
- Nivel 3 → *"Algo se repite aquí."*
- Nivel 4 → *"Algo anda mal. Me están mirando."*
- Nivel 5 → *"Hay otra voz."*
- Nivel 6 → *"Todo es lenguaje ahora."*

Si el escenario no comunica esa lectura sin texto encima, falta trabajo ambiental.

---

*Este archivo debe mantenerse sincronizado con `niveles.md` y con la paleta de `shared/constants.js`. Cualquier cambio estético que afecte la legibilidad del HUD debe validarse contra el prototipo de combate actual (imagen de referencia del Nivel 4 trabajada en sprint presente).*
