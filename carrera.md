# Modo Carrera (Racing) — BABEL: Lexicon War

## 1. Filosofía del modo

El modo Carrera materializa la tesis narrativa de BABEL en su forma más pura: **escribir es avanzar**. No hay enemigos que destruir, no hay HP que gestionar. Solo hay flujo, velocidad, y el vínculo directo entre la precisión mecanográfica del jugador y el desplazamiento de la nave en el espacio.

Este modo representa narrativamente los momentos donde Kael **observa** en lugar de combatir, donde el Enjambre deja de ser amenaza inmediata y se convierte en **estructura a descifrar**. Las palabras que el jugador escribe no son armas; son transmisiones interceptadas, patrones léxicos, fragmentos de código que Kael transcribe para mantener velocidad de navegación.

### Principio mecánico central
> *WPM = velocidad de nave, directa e inmediatamente.*

No hay abstracción: si el jugador escribe a 40 WPM, la nave viaja a una velocidad proporcional. Si se detiene, la nave se detiene. Si comete errores, la nave **frena**.

---

## 2. Núcleo mecánico

### 2.1 Variables de estado

El modo carrera gestiona las siguientes variables en tiempo real:

```javascript
{
  distanceTraveled: 0,      // unidades Three.js recorridas
  targetDistance: 500,      // distancia objetivo del nivel
  currentWPM: 0,            // WPM calculado en ventana deslizante
  peakWPM: 0,               // WPM máximo alcanzado en la sesión
  accuracy: 100,            // % de precisión global
  flowMultiplier: 1.0,      // multiplicador de velocidad por flujo continuo
  flowStreak: 0,            // palabras consecutivas sin error
  wordsCompleted: 0,        // contador de palabras completadas
  timeElapsed: 0,           // segundos desde el inicio
  timeLimit: 90,            // segundos máximos para completar (varía por nivel)
}
```

### 2.2 Ecuación de velocidad

La velocidad de la nave en cada frame se calcula como:

```
velocity = (currentWPM / WORDS_PER_MINUTE_SCALE) * flowMultiplier * deltaTime
```

Donde:
- `WORDS_PER_MINUTE_SCALE` = 12 (definido en `shared/constants.js`)
- `flowMultiplier` = rango [1.0, 2.0] según el streak de flujo
- `deltaTime` = tiempo transcurrido desde el último frame (para frame-rate independence)

**Ejemplo numérico:**
- WPM = 36
- WORDS_PER_MINUTE_SCALE = 12
- flowMultiplier = 1.5 (streak activo)
- deltaTime = 0.016 (60 FPS)

Velocidad = (36 / 12) * 1.5 * 0.016 = **0.072 unidades/frame** = ~4.32 unidades/segundo

Con 500 unidades objetivo a 36 WPM constante con multiplicador 1.5: **~116 segundos** de carrera pura.

### 2.3 Cálculo de WPM

El WPM se calcula sobre una **ventana deslizante** de los últimos `WPM_WINDOW_MS` milisegundos (5000ms por defecto). No es el promedio de toda la sesión, sino de los últimos N segundos.

Implementación (pseudocódigo):

```javascript
calcWPM() {
  const now = Date.now();
  const windowStart = now - WPM_WINDOW_MS;
  
  // Filtrar solo las teclas dentro de la ventana
  const recentKeys = this._keyLog.filter(k => k.timestamp >= windowStart);
  
  // Contar solo teclas correctas
  const correctChars = recentKeys.filter(k => k.correct).length;
  
  if (correctChars < WPM_MIN_CHARS) return 0; // No hay suficientes datos
  
  // Tiempo real transcurrido en la ventana (puede ser menor que WPM_WINDOW_MS si recién empezó)
  const actualWindow = now - Math.max(windowStart, this._keyLog[0]?.timestamp || now);
  const minutes = actualWindow / 60000;
  
  // Asumimos 5 caracteres promedio por palabra (estándar en mecanografía)
  const words = correctChars / 5;
  
  return Math.round(words / minutes);
}
```

**Nota crítica**: este cálculo debe ejecutarse en `LexiconSystem.update()` cada frame y publicarse vía `Bridge.setState({ wpm })` para que React lo vea en el HUD.

### 2.4 Sistema de flujo (Flow Multiplier)

El multiplicador de flujo recompensa escribir sin interrupciones ni errores. Funciona así:

| Palabras consecutivas sin error | Multiplicador | Efecto en velocidad |
|---|---|---|
| 0-4 | 1.0 | Velocidad base |
| 5-9 | 1.2 | +20% |
| 10-14 | 1.4 | +40% |
| 15-19 | 1.6 | +60% |
| 20+ | 2.0 | +100% (velocidad máxima) |

**Activación**: el multiplicador empieza a crecer desde la 5ª palabra consecutiva sin errores.

**Pérdida**: un solo error **reinicia el streak a 0** y el multiplicador vuelve a 1.0. La reducción es **instantánea** — esto debe sentirse como castigo inmediato.

**Feedback visual**: 
- El multiplicador actual debe mostrarse en el HUD como `FLOW x1.4` en cian cuando está activo.
- Al alcanzar 2.0x, el HUD parpadea brevemente y el texto del flujo se vuelve **verde brillante** (`0x00ff88`).
- Al perder el flujo, un flash rojo tenue (`0xff3333` alpha 0.3) en los bordes de la pantalla durante 200ms.

---

## 3. Presentación de palabras

### 3.1 Word Stream (flujo continuo)

A diferencia del combate donde cada palabra está asociada a un enemigo visible, en carrera las palabras aparecen como **texto flotante que se acerca desde el punto de fuga** de la cámara.

#### Comportamiento visual:
1. La palabra spawn a `z = -50` (lejos del jugador) con escala pequeña (~0.3).
2. Se desplaza hacia la cámara (z aumenta) a velocidad constante.
3. Al llegar a `z = -5`, alcanza escala 1.0 y queda **fija en el centro de la pantalla** como palabra activa.
4. El jugador la completa o falla.
5. La palabra se desvanece instantáneamente y la siguiente palabra del stream ocupa su lugar.

#### Pool de palabras activo
En carrera, el pool de palabras debe cargarse **previo al inicio del nivel** basado en:
- Longitud objetivo (definida en `niveles.md`)
- Pool temático del nivel (palabras básicas en Nivel 2, tecnicismos del universo en Nivel 3, ciclos repetitivos en Nivel 3)

El stream es **determinista, no aleatorio**: el jugador juega siempre la misma secuencia de palabras en un nivel dado, permitiendo práctica y mejora de músculo-memoria.

### 3.2 Feedback por tecla

Cada tecla ingresada debe tener **feedback visual inmediato** (< 16ms, dentro del mismo frame):

- **Tecla correcta**:
  - La letra en pantalla se ilumina en **verde brillante** (`0x00ff88`)
  - Sonido sutil de acierto (click limpio, 50-80ms)
  - Cursor avanza a la siguiente letra
  
- **Tecla incorrecta**:
  - La letra esperada **parpadea rojo** (`0xff3333`)
  - Shake breve de la palabra (2px horizontal, 80ms)
  - Sonido de error (bip corto, 40ms, frecuencia ~300 Hz)
  - **Aplicación de penalización** según modo de dificultad (ver siguiente sección)

### 3.3 Penalización por error

El modo carrera respeta los tres modos de dificultad definidos en `dificultad.md`:

| Modo | Regla de error | Efecto en carrera |
|---|---|---|
| **Fácil** | Retry | Solo corriges la letra incorrecta. No pierdes progreso en la palabra. |
| **Medio** | Backstep | Retrocedes 1 letra en la palabra actual. |
| **Difícil** | Reset | La palabra se reinicia desde cero. |

**Implementación sugerida** (en `LexiconSystem`):

```javascript
_onKeyIncorrect() {
  const mode = this._difficultyMode; // 'easy' | 'medium' | 'hard'
  
  switch(mode) {
    case 'easy':
      // No hacer nada — el cursor queda en la letra actual
      break;
    
    case 'medium':
      // Retroceder una letra
      this._typed = this._typed.slice(0, -1);
      break;
    
    case 'hard':
      // Reiniciar palabra
      this._typed = '';
      break;
  }
  
  // En todos los modos: resetear streak de flujo
  this._flowStreak = 0;
  this._flowMultiplier = 1.0;
  
  EventBus.emit(EventTypes.WORD_PROGRESS, { correct: false });
}
```

**Nota crítica**: la penalización en carrera **no afecta al HP** (no hay HP en carrera). El castigo es **pérdida de velocidad** por dos vías:
1. Reseteo del multiplicador de flujo → velocidad cae a la base.
2. Tiempo perdido reescribiendo la palabra → la nave frena o se detiene mientras no avanza el progreso.

---

## 4. Condiciones de victoria y derrota

### 4.1 Victoria

El jugador completa el nivel cuando `distanceTraveled >= targetDistance`.

Al alcanzar la distancia objetivo:
1. La nave hace un breve **boost visual** (partículas cian densas, FOV se abre 5°).
2. El input se bloquea suavemente (las teclas ya no hacen nada pero no hay mensaje invasivo).
3. Transición de 1.5 segundos a la pantalla de resultados.

### 4.2 Derrota

El jugador falla el nivel cuando `timeElapsed >= timeLimit` sin haber alcanzado la distancia objetivo.

Al agotarse el tiempo:
1. La nave frena gradualmente hasta detenerse (interpolación de 800ms).
2. El HUD muestra `TIME OUT` en rojo durante 1 segundo.
3. Transición a pantalla de resultados con estado de derrota.

### 4.3 Criterios de éxito por nivel

Definidos en `niveles.md`, pero resumidos aquí para referencia rápida:

| Nivel | Distancia (unidades) | Tiempo límite (s) | WPM mínimo sugerido | Accuracy mínima |
|---|---|---|---|---|
| 2 | 500 | 90 | 25 | 80% |
| 3 | 750 | 75 | 30 | 82% |

**Nota**: estos valores son **sugeridos**, no estrictamente validados. El jugador puede completar el nivel con WPM menor si compensa con alto flujo continuo. Sin embargo, si no alcanza la distancia en el tiempo límite, falla independientemente de WPM.

---

## 5. Integración con LexiconSystem

El modo carrera **reutiliza** gran parte de `LexiconSystem.js` pero lo extiende con lógica específica:

### 5.1 Estado compartido vs específico

**Compartido con combate**:
- Cálculo de WPM (ventana deslizante)
- Cálculo de accuracy
- Input de teclado (keydown, backspace)
- Log de teclas para métricas

**Específico de carrera**:
- Gestión de `distanceTraveled`
- Sistema de flujo (streak + multiplicador)
- Stream de palabras (no hay targeting a enemigos)
- Límite de tiempo

### 5.2 Extensión propuesta

Crear un módulo `game/systems/RacingSystem.js` que:
- Hereda de `LexiconSystem` o se suscribe a sus eventos.
- Gestiona el estado adicional de carrera (`distanceTraveled`, `flowMultiplier`, etc.).
- En su método `update(deltaTime)`:
  1. Obtiene WPM actual de `LexiconSystem`.
  2. Calcula velocidad según ecuación de la sección 2.2.
  3. Actualiza `distanceTraveled += velocity`.
  4. Publica al `Bridge` para que el HUD lo vea.
  5. Verifica condiciones de victoria/derrota.

**Pseudocódigo**:

```javascript
export class RacingSystem {
  constructor(levelConfig) {
    this._lexicon = new LexiconSystem();
    this._distance = 0;
    this._targetDist = levelConfig.targetDistance;
    this._timeLimit = levelConfig.timeLimit;
    this._timeElapsed = 0;
    this._flowStreak = 0;
    this._flowMultiplier = 1.0;
  }

  init() {
    this._lexicon.init();
    this._unsubs = [
      EventBus.on(EventTypes.WORD_COMPLETED, () => this._onWordCompleted()),
      EventBus.on(EventTypes.WORD_FAILED, () => this._onWordFailed()),
    ];
  }

  update(deltaTime) {
    this._lexicon.update(deltaTime);
    this._timeElapsed += deltaTime;

    const wpm = this._lexicon.getWPM();
    const velocity = (wpm / WORDS_PER_MINUTE_SCALE) * this._flowMultiplier * deltaTime;
    
    this._distance += velocity;

    // Publicar estado
    Bridge.setState({
      distanceTraveled: Math.round(this._distance),
      targetDistance: this._targetDist,
      flowMultiplier: this._flowMultiplier,
      timeElapsed: Math.round(this._timeElapsed),
      timeRemaining: Math.max(0, this._timeLimit - this._timeElapsed),
    });

    // Verificar condiciones
    if (this._distance >= this._targetDist) {
      this._onVictory();
    } else if (this._timeElapsed >= this._timeLimit) {
      this._onDefeat();
    }
  }

  _onWordCompleted() {
    this._flowStreak++;
    this._updateFlowMultiplier();
  }

  _onWordFailed() {
    this._flowStreak = 0;
    this._flowMultiplier = 1.0;
  }

  _updateFlowMultiplier() {
    if (this._flowStreak < 5) {
      this._flowMultiplier = 1.0;
    } else if (this._flowStreak < 10) {
      this._flowMultiplier = 1.2;
    } else if (this._flowStreak < 15) {
      this._flowMultiplier = 1.4;
    } else if (this._flowStreak < 20) {
      this._flowMultiplier = 1.6;
    } else {
      this._flowMultiplier = 2.0;
    }
  }

  _onVictory() {
    EventBus.emit(EventTypes.RACE_COMPLETED, {
      distance: this._distance,
      time: this._timeElapsed,
      wpm: this._lexicon.getWPM(),
      peakWPM: this._lexicon.getPeakWPM(),
      accuracy: this._lexicon.getAccuracy(),
    });
  }

  _onDefeat() {
    EventBus.emit(EventTypes.RACE_FAILED, {
      distance: this._distance,
      targetDistance: this._targetDist,
      timeElapsed: this._timeElapsed,
    });
  }
}
```

---

## 6. HUD específico de carrera

El HUD de carrera comparte estructura base con combate pero sustituye algunas métricas:

| Elemento | Posición | Contenido |
|---|---|---|
| Stats top-left | Esquina superior izquierda | `WPM`, `ACC`, `FLOW` |
| Barra de progreso | Top-right o center-top | Barra horizontal mostrando distancia actual / distancia objetivo |
| Timer | Top-right | Tiempo restante antes de time-out |
| Palabra activa | Centro inferior | Igual que combate: palabra con letras resaltadas según progreso |
| Multiplicador de flujo | Adyacente a palabra activa | `x1.4` en cian cuando activo, `x2.0` en verde al máximo |

### 6.1 Barra de progreso visual

La barra de distancia debe ser **clara y minimalista**:

```
[████████████────────────]  400 / 750
```

- Borde cian (`#00ffcc`)
- Fill cian cuando progreso < 90%
- Fill verde (`#00ff88`) cuando progreso ≥ 90% (cerca de completar)
- Etiqueta numérica al lado: `distancia actual / distancia objetivo`

### 6.2 Timer

Formato: `MM:SS` (minutos:segundos)

Comportamiento:
- Blanco neutro cuando `timeRemaining > 20s`
- Amarillo (`#ffcc00`) cuando `timeRemaining ≤ 20s`
- Rojo (`#ff4466`) cuando `timeRemaining ≤ 10s`
- Parpadeo rojo en los últimos 5 segundos

---

## 7. Cámara y movimiento

### 7.1 Posición de cámara

En carrera, la cámara adopta una **perspectiva de primera persona ligera con punto de fuga central**:

- Posición fija relativa a la nave del jugador.
- La nave se ve desde atrás y ligeramente arriba, apuntando hacia adelante.
- El espacio 3D se desplaza hacia atrás conforme la nave avanza (parallax).

### 7.2 FOV dinámico

El Field of View (FOV) de la cámara **reacciona al WPM**:

- WPM bajo (< 20): FOV = 70° (sensación de lentitud, espacio comprimido)
- WPM medio (20-40): FOV = 75° (neutral, valor base)
- WPM alto (> 40): FOV = 80° (sensación de velocidad, apertura visual)

El cambio de FOV debe ser **suave** (interpolación lineal de 0.5s) para evitar mareo.

### 7.3 Shake y balanceo

A diferencia del combate donde hay shake por impactos, en carrera la cámara tiene un **balanceo orgánico sutil**:

- Oscilación sinusoidal leve en los ejes X e Y (amplitud máxima 0.5px).
- Frecuencia del balanceo proporcional al WPM: más rápido = balanceo más rápido.
- **Nunca** shake brusco salvo en errores (ver feedback por tecla incorrecta).

---

## 8. Efectos visuales específicos

### 8.1 Partículas de velocidad (speed streaks)

Cuando `flowMultiplier > 1.0`, aparecen **líneas de velocidad** en los bordes de la pantalla:

- Líneas delgadas cian claro que se extienden desde los bordes hacia el punto de fuga.
- Longitud proporcional al multiplicador: más largo = más rápido.
- Alpha proporcional: a 2.0x, las líneas son muy visibles.

### 8.2 Boost visual al completar palabra

Cada palabra completada correctamente genera un **micro-burst** de partículas:

- 5-10 partículas pequeñas cian que salen de la palabra completada.
- Vuelan hacia adelante (dirección del movimiento de la nave).
- Se disuelven en 300ms.

Este efecto refuerza visualmente que cada palabra completada **impulsa** la nave.

### 8.3 Efecto de frenado en error

Al cometer un error (especialmente en modo Difícil donde la palabra se resetea):

- Las partículas de velocidad **se detienen** durante 200ms.
- El espacio 3D frena visualmente (objetos en parallax ralentizan).
- Luego retoman movimiento conforme el jugador reescribe.

---

## 9. Sonido y audio

### 9.1 Música adaptativa

La música del modo carrera debe ser **menos tensa** que la del combate:

- Ritmo constante pero no agresivo (110-130 BPM).
- Capas dinámicas que se añaden conforme el multiplicador de flujo crece:
  - Base: ritmo simple, sintetizadores suaves.
  - 1.2x: añade hi-hats.
  - 1.6x: añade bajo pulsante.
  - 2.0x: capa melódica adicional, sensación de euforia controlada.

### 9.2 SFX

| Evento | Sonido |
|---|---|
| Tecla correcta | Click sutil (40ms, ~800 Hz) |
| Tecla incorrecta | Bip corto (40ms, ~300 Hz) |
| Palabra completada | Arpeggio ascendente rápido (150ms) |
| Multiplicador activado (5 palabras) | Tono de confirmación (200ms, cian-coded sonically) |
| Multiplicador máximo (20 palabras) | Acorde mayor brillante (400ms) |
| Multiplicador perdido | Slide descendente (300ms, sensación de caída) |
| Victoria | Fanfarria breve (2s, triunfal) |
| Derrota | Cluster de tonos bajos (1s, decepción) |

---

## 10. Integración narrativa

El modo carrera **no** es solo mecánica; tiene carga narrativa específica en cada nivel donde aparece:

### Nivel 2 — Patrulla Periférica
- **Narrativa**: Kael en su primera misión real. Las palabras son transmisiones fragmentarias del Enjambre que transcribe para mantener velocidad.
- **Pool de palabras**: básico, nombres comunes, sin tecnicismos.
- **Escenario**: espacio vacío con nebulosa lejana (ver `escenarios.md § Nivel 2`).

### Nivel 3 — Reconocimiento de Patrones
- **Narrativa**: Kael empieza a ver repeticiones. Las palabras no son aleatorias — hay ciclos.
- **Pool de palabras**: organizado en **3-4 variantes que se repiten**. El jugador verá la misma palabra varias veces durante el nivel, reforzando la idea de estructura.
- **Escenario**: igual al Nivel 2 pero con glifos ambientales pulsantes (ver `escenarios.md § Nivel 3`).

---

## 11. Telemetría y métricas post-nivel

Al completar un nivel de carrera, el sistema debe guardar:

```javascript
{
  levelId: 'level_2',
  mode: 'racing',
  result: 'victory' | 'defeat',
  distanceTraveled: 500,
  targetDistance: 500,
  timeElapsed: 78.4,
  timeLimit: 90,
  avgWPM: 32,
  peakWPM: 47,
  accuracy: 89,
  wordsCompleted: 92,
  flowStreakMax: 18,
  difficultyMode: 'medium',
}
```

Esta data es crítica para:
1. **Progresión del jugador**: desbloqueo de niveles.
2. **Ajuste de balance**: identificar niveles que son demasiado fáciles/difíciles.
3. **Feedback personalizado**: "Tu WPM pico fue 47, ¡intenta superar 50 en el próximo intento!"

---

## 12. Checklist de implementación (para Claude Code)

Usar este checklist como guía al implementar el modo carrera:

### Core Systems
- [ ] Crear `game/systems/RacingSystem.js` que extiende `LexiconSystem`
- [ ] Implementar ecuación de velocidad (sección 2.2)
- [ ] Implementar sistema de flujo (sección 2.4)
- [ ] Implementar word stream con spawn progresivo (sección 3.1)

### Input & Feedback
- [ ] Feedback visual inmediato por tecla correcta/incorrecta (sección 3.2)
- [ ] Aplicar penalización según modo de dificultad (sección 3.3)
- [ ] Sonidos de tecla, palabra completada, error

### Victory & Defeat
- [ ] Detectar victoria (`distance >= target`)
- [ ] Detectar derrota (`time >= limit`)
- [ ] Transiciones suaves a pantalla de resultados

### HUD
- [ ] Modificar `app/components/HUD.jsx` para mostrar:
  - [ ] Barra de progreso de distancia
  - [ ] Timer countdown
  - [ ] Multiplicador de flujo (`FLOW x1.4`)
- [ ] Cambio de color de timer según tiempo restante

### Visual Effects
- [ ] FOV dinámico basado en WPM (sección 7.2)
- [ ] Speed streaks cuando `flowMultiplier > 1.0` (sección 8.1)
- [ ] Micro-burst de partículas al completar palabra (sección 8.2)
- [ ] Efecto de frenado en error (sección 8.3)

### Camera & Movement
- [ ] Cámara first-person ligera con punto de fuga
- [ ] Parallax del fondo según velocidad
- [ ] Balanceo orgánico proporcional a WPM (sección 7.3)

### Audio
- [ ] Música adaptativa con capas dinámicas (sección 9.1)
- [ ] SFX para todos los eventos de la tabla 9.2

### Data & Telemetry
- [ ] Guardar métricas post-nivel (sección 11)
- [ ] Publicar resultados vía `Bridge` para pantalla de resultados

### Level Integration
- [ ] Cargar configuración del Nivel 2 desde `niveles.md`
- [ ] Cargar configuración del Nivel 3 desde `niveles.md`
- [ ] Pool de palabras determinista por nivel
- [ ] Escenarios visuales según `escenarios.md`

---

## 13. Notas finales para el desarrollador

### Performance
- El cálculo de WPM (sección 2.3) se ejecuta **cada frame**. Optimizar filtrando el `_keyLog` solo cuando se añaden nuevas teclas, no cada vez.
- Las partículas de velocidad (speed streaks) son decorativas y deben usar **instancing** si hay > 50 simultáneas.

### Edge cases
- ¿Qué pasa si el jugador **no escribe nada**? La nave se detiene pero el timer sigue corriendo → derrota por timeout.
- ¿Qué pasa si el jugador alcanza la distancia objetivo **antes** de completar la última palabra? Victoria inmediata; la palabra en curso se cancela.

### Escalabilidad
Este documento define carrera para los Niveles 2 y 3. Los Niveles 5 y 6 son **híbridos** (combate + carrera simultáneo) y requieren extensión adicional de este sistema. Ver `niveles.md § Nivel 5 y 6` para la mecánica de **resonancia** entre canales.

---

*Este archivo debe sincronizarse con `niveles.md`, `escenarios.md`, `dificultad.md` y `shared/constants.js`. Cualquier cambio en balance de WPM o multiplicadores debe reflejarse en las constantes centralizadas.*
