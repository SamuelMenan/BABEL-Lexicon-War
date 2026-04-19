# Niveles — BABEL: Lexicon War

## 1. Filosofía

Los niveles de BABEL no son escalones arbitrarios de dificultad: son un **arco narrativo mecánico**. Cada nivel reproduce, en forma jugable, un momento del viaje de Kael desde combatiente hasta mediador. La curva de dificultad lineal (nivel 1 suave → nivel 6 muy intenso) acompaña la transformación del personaje; el jugador siente el mismo desgaste, precisión creciente y eventual síntesis que vive Kael en la historia.

> *"Las palabras no se acaban. Solo cambian de mano."*

Esta frase atraviesa los seis niveles como hilo conductor. En el nivel 1 es un pie de página. En el nivel 6 es la mecánica central.

---

## 2. Estructura general

- **6 niveles obligatorios**, jugados en orden narrativo.
- **Dificultad lineal**: cada nivel es más intenso que el anterior en velocidad, densidad, longitud de palabra y exigencia de flujo.
- **Tres tipos de nivel**:
	- **Combate** — el jugador destruye unidades del Enjambre escribiendo su palabra-núcleo.
	- **Carrera** — el jugador avanza por un entorno 3D escribiendo flujo continuo.
	- **Híbrido** — combate y carrera simultáneos en canales distintos.
- **Distribución definitiva**:
	1. Combate
	2. Carrera
	3. Carrera
	4. Combate
	5. Híbrido (Primer contacto con Lyra)
	6. Híbrido (Puente léxico / clímax)

### Relación con `dificultad.md`

La dificultad **por nivel** (este archivo) y el **modo de error** (Fácil / Medio / Difícil definido en `dificultad.md`) son **ejes independientes**:

- Los niveles escalan: velocidad enemiga, densidad de oleada, longitud de palabra, WPM objetivo.
- El modo de error define: qué pasa cuando fallas una letra (retry / backstep / reset).

El jugador elige su modo de error una vez en el menú; los niveles se ajustan automáticamente según su posición en la campaña.

---

## 3. Arco narrativo general

| Nivel | Momento narrativo | Estado de Kael |
|---|---|---|
| 1 | Simulación TYPO antes del despliegue | Cadete, precisión sin contexto |
| 2 | Primera patrulla real | Piloto inexperto, reaccionando |
| 3 | Kael empieza a notar repeticiones en el Enjambre | Observador, sospechoso |
| 4 | El Enjambre cambia. El patrón se vuelve innegable | Confrontado con lo imposible |
| 5 | Lyra contacta desde dentro del Enjambre | Dividido entre combatir y escuchar |
| 6 | Kael escribe el puente léxico | Mediador, ya no combatiente |

---

## 4. Niveles

### Nivel 1 — Simulación Cero

**Modo**: Combate
**Duración estimada**: 90-120 s

#### Narrativa
Kael está en el simulador del Programa TYPO, antes de su primer despliegue. Las unidades del Enjambre son reconstrucciones de archivo: se mueven de forma predecible, sus palabras son simples, y un instructor invisible marca el ritmo. Todo lo que aprenderá dolorosamente en los siguientes niveles aquí se presenta en su forma limpia. La frase *"Las palabras no se acaban. Solo cambian de mano"* aparece como texto de carga del simulador, sin explicación.

#### Objetivo
Familiarizar al jugador con el núcleo de combate: identificar enemigo, escribir palabra-núcleo, observar colapso.

#### Balance
- Velocidad enemiga: **1.0** (0.67× base)
- Enemigos concurrentes: **máximo 2**
- Intervalo entre oleadas: **10 000 ms**
- Oleadas: **3**
- Longitud de palabra: **3-5 caracteres**
- Pool de palabras: básico (nombres comunes, sin tecnicismos)
- Enemigos élite: **ninguno**

#### Criterios de éxito
- Completar las 3 oleadas con HP ≥ 60
- Accuracy ≥ 85%
- Sin límite estricto de WPM (es tutorial)

#### Derrota
- HP = 0

---

### Nivel 2 — Patrulla Periférica

**Modo**: Carrera
**Duración estimada**: 75-90 s

#### Narrativa
Primera misión real de Kael. Es enviado a patrullar un sector donde el Enjambre ha sido detectado de forma errática. No hay enemigos visibles todavía; solo la nave atravesando un campo de señales fragmentarias. El flujo de palabras en pantalla son transmisiones interceptadas que Kael debe transcribir para mantener velocidad.

#### Objetivo
Introducir el modo carrera: flujo continuo, multiplicador de velocidad, sensación de avance ligado a la escritura.

#### Balance
- Distancia objetivo: **~500 unidades** (~100 palabras)
- Tiempo máximo: **90 s**
- WPM objetivo: **≥ 20**
- Longitud de palabra: **4-6 caracteres**
- Penalización por error: ligera (pérdida de multiplicador, no de progreso)
- Multiplicador de flujo: activo desde la 5ª palabra consecutiva sin fallo

#### Criterios de éxito
- Completar la distancia antes del tiempo límite
- Accuracy ≥ 80%
- WPM promedio ≥ 25

#### Derrota
- Tiempo agotado sin llegar al final

---

### Nivel 3 — Reconocimiento de Patrones

**Modo**: Carrera
**Duración estimada**: 60-75 s

#### Narrativa
Kael nota algo extraño en la patrulla: ciertas secuencias de las transmisiones se repiten. No son idénticas, pero siguen una estructura. El sistema de análisis de la nave empieza a marcar coincidencias. El jugador ve visualmente que las palabras no son aleatorias: hay grupos que ciclan. Este es el primer nivel que insinúa que el Enjambre **dice algo**.

#### Objetivo
Subir la exigencia de WPM y establecer la idea de que el Enjambre tiene estructura, no ruido.

#### Balance
- Distancia objetivo: **~750 unidades** (~150 palabras)
- Tiempo máximo: **75 s**
- WPM objetivo: **≥ 30**
- Longitud de palabra: **5-7 caracteres**
- Penalización por error: media
- Multiplicador de flujo: activo desde la 10ª palabra consecutiva, con bonus si se mantiene > 20
- **Palabras en ciclos**: el pool está compuesto por 3-4 variantes que se repiten en patrón (refuerza la sensación de estructura)

#### Criterios de éxito
- Completar la distancia antes del tiempo límite
- Accuracy ≥ 82%
- WPM promedio ≥ 30
- Opcional (logro): detectar los 3 ciclos completos sin fallar ninguno

#### Derrota
- Tiempo agotado sin llegar al final

---

### Nivel 4 — Ruptura

**Modo**: Combate
**Duración estimada**: 120-150 s

#### Narrativa
El Enjambre cambia. Las oleadas ya no son aleatorias; los enemigos llegan en formaciones que responden a las acciones de Kael. Entre las palabras-núcleo ordinarias empiezan a aparecer secuencias que no pertenecen a ninguna lengua humana. Al final de la última oleada, un fragmento de texto atraviesa la pantalla sin remitente: **"KV — SOY LYRA — SIGO AQUÍ"**. El nivel termina en ese instante. Este es el punto de quiebre de la campaña.

#### Objetivo
Llevar al jugador al pico de la dificultad puramente combativa antes de introducir el híbrido. Narrativamente, cerrar la etapa "Kael combatiente".

#### Balance
- Velocidad enemiga: **1.5** (base)
- Enemigos concurrentes: **máximo 5**
- Intervalo entre oleadas: **8 000 ms**
- Oleadas: **5**
- Longitud de palabra: **5-8 caracteres**
- Pool de palabras: ampliado (incluye tecnicismos del universo: `enjambre`, `léxico`, `sintaxis`, `glifo`)
- Enemigos élite: **1-2 por oleada** con palabras compuestas de 8-10 caracteres

#### Criterios de éxito
- Completar las 5 oleadas con HP ≥ 40
- Accuracy ≥ 80%
- Disparador narrativo: el mensaje de Lyra aparece al vencer al último enemigo (obligatorio, no opcional)

#### Derrota
- HP = 0

---

### Nivel 5 — Interferencia

**Modo**: Híbrido (Combate + Carrera)
**Duración estimada**: 150-180 s
**Evento narrativo**: Primer contacto con Lyra

#### Narrativa
Mientras Kael combate una nueva oleada, una línea de texto que no pertenece al sistema aparece en la periferia de su pantalla. Es Lyra. El jugador enfrenta por primera vez la tensión central del tercer acto: combatir en el canal principal **y a la vez** sostener la transmisión de Lyra escribiendo en un canal paralelo. La escena reproduce literalmente la imagen del PDF: *"Kael escribía dos realidades al mismo tiempo"*.

#### Objetivo
Introducir la mecánica híbrida. Forzar al jugador a decidir dónde pone su atención. Establecer la "resonancia" como recompensa por alternar con precisión.

#### Balance
- **Canal de combate** (principal):
	- Velocidad enemiga: **1.6**
	- Enemigos concurrentes: **máximo 4**
	- Oleadas: **4**
	- Longitud de palabra: **5-7 caracteres**
- **Canal de carrera** (periférico — transmisión de Lyra):
	- Prompt en ventana lateral, opcional pero degradable
	- Longitud de palabra: **6-9 caracteres**
	- El mensaje se "desvanece" si el jugador lo ignora > 8 s (pierde progreso)
- **Mecánica de resonancia**:
	- Alternar entre canales correctamente genera un buff temporal llamado *resonancia* (+15% daño en combate, +10% velocidad en carrera)
	- Se acumula con hasta 3 alternancias consecutivas sin fallo

#### Criterios de éxito
- Sobrevivir las 4 oleadas
- Completar ≥ 70% del mensaje de Lyra
- HP final ≥ 30

#### Derrota
- HP = 0, **o**
- Mensaje de Lyra < 30% al finalizar las oleadas (Lyra se pierde; el nivel debe reintentarse)

---

### Nivel 6 — El Puente Léxico

**Modo**: Híbrido (Combate + Carrera)
**Duración estimada**: 180-240 s
**Evento narrativo**: Clímax de la campaña

#### Narrativa
Kael ya no combate al Enjambre en el sentido antiguo. Escribe el puente léxico que Lyra le dicta: una secuencia larga, imposible, que atraviesa dos lógicas. Las unidades del Enjambre siguen apareciendo porque no todas entienden aún, pero a medida que el puente avanza, unidades enteras **colapsan sin que Kael tenga que escribir su palabra**: se rinden. El combate se apaga no por victoria militar sino por comprensión. Cuando el puente alcanza el 100%, el Enjambre se detiene. La frase *"El significado pertenece a quien lo comparte, no a quien lo impone"* cierra el nivel.

#### Objetivo
Materializar mecánicamente la tesis de la obra: escribir **transforma** el sistema en lugar de destruirlo. La victoria no se consigue combatiendo sino completando el canal de carrera.

#### Balance
- **Canal de combate** (persistente pero decreciente):
	- Velocidad enemiga: **2.0**
	- Enemigos concurrentes: **máximo 6** al inicio, decrece con hitos del puente
	- Longitud de palabra: **6-9 caracteres**
	- Oleadas: continuas hasta que el puente llega al 100%
- **Canal de carrera** (el puente léxico):
	- Secuencia de **~150 palabras** únicas, sin repetición
	- Longitud de palabra: **7-10 caracteres**
	- Pool específico del puente: mezcla de nexolang, glifos y términos filosóficos (`interpretar`, `significado`, `puente`, `umbral`, `reconfigurar`)
- **Mecánica de colapso por hito**:
	- 25% puente → velocidad enemiga baja a 1.8 y 2 enemigos en pantalla colapsan
	- 50% puente → máximo enemigos concurrentes baja a 4
	- 75% puente → velocidad enemiga baja a 1.4 y 3 enemigos colapsan
	- 100% puente → todos los enemigos restantes colapsan; gatillo de cinemática final
- **Resonancia acumulativa**: no se reinicia entre alternancias; crece durante todo el nivel

#### Criterios de éxito
- Completar el puente léxico al 100% antes de HP = 0
- Accuracy global ≥ 75% (nivel más permisivo en accuracy porque la exigencia está en la longitud)

#### Derrota
- HP = 0 antes de alcanzar 100% del puente

---

## 5. Tabla de progresión (resumen de parámetros)

| Nivel | Modo | Velocidad enemiga | Enemigos max | Oleadas | Long. palabra | WPM objetivo | Accuracy mín. |
|---|---|---|---|---|---|---|---|
| 1 | Combate | 1.0 | 2 | 3 | 3-5 | — | 85% |
| 2 | Carrera | — | — | — | 4-6 | 25 | 80% |
| 3 | Carrera | — | — | — | 5-7 | 30 | 82% |
| 4 | Combate | 1.5 | 5 | 5 | 5-8 | — | 80% |
| 5 | Híbrido | 1.6 | 4 | 4 | 5-7 / 6-9 | 35 | 78% |
| 6 | Híbrido | 2.0 → 1.4 | 6 → 0 | continuas | 6-9 / 7-10 | 40 | 75% |

---

## 6. Notas de implementación

- El sistema de niveles debe vivir en `game/systems/ProgressionSystem.js`, con un registro declarativo de cada nivel que exponga: `type`, `params`, `successCriteria`, `narrativeEvents`.
- Los parámetros numéricos deben derivarse (o sobrescribir) los valores base de `shared/constants.js`, no duplicarlos. Si un nivel define `enemySpeed = 1.5`, debe usar `ENEMY_BASE_SPEED` como referencia.
- Los eventos narrativos (mensaje de Lyra en nivel 4, cinemática final en nivel 6) deben emitirse vía `shared/bridge.js` siguiendo el principio de arquitectura: `game/` nunca importa de `app/`.
- El modo híbrido (niveles 5-6) requiere que `LexiconSystem.js` soporte **dos focos de input simultáneos** con alternancia por tecla modificadora (propuesta: `Tab` alterna el canal activo, o foco automático por proximidad del cursor).
- El nivel 6 no tiene oleadas fijas: su condición de fin es un umbral de progreso en el canal de carrera, no una cuenta de enemigos. La lógica de spawn debe ser reactiva al estado del puente.

---

## 7. Criterios globales

- **Continuidad del input**: ningún cambio de nivel interrumpe la captura de teclado sin transición explícita. Entre niveles, el input se conserva pero se enruta a un prompt neutro (p. ej. `PRESIONA CUALQUIER TECLA PARA CONTINUAR`).
- **Reintentos**: un nivel fallado se reinicia sin penalización de progresión; el jugador no pierde niveles desbloqueados.
- **Telemetría mínima por nivel**:
	- Accuracy final
	- WPM promedio y WPM pico
	- Tiempo total
	- Oleada / hito alcanzado
	- Modo de error seleccionado (para cruzar con `dificultad.md`)
- **Saltos narrativos**: los niveles 4, 5 y 6 no son saltables. Los niveles 1-3 pueden ofrecerse como "entrenamiento libre" desde el menú tras completarse una vez.

---

*Este archivo debe mantenerse sincronizado con `dificultad.md` y con los valores de `shared/constants.js`. Cualquier cambio de balance en un nivel se refleja en la tabla de la sección 5.*
