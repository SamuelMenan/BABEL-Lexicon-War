# FLUJO·LEX — Estado de Flow del Jugador

> Documento de diseño del estado **FLUJO·LEX** para BABEL: Lexicon War.
> Aplica al **modo Combate**. Define la mecánica, la progresión visual y los
> contratos de implementación entre `game/` y `app/`.

---

## 1. Concepto

**FLUJO·LEX** es el estado de gracia del piloto-escritor. Cuando Kael escribe
con tal velocidad y precisión que su sintaxis se vuelve continua, la nave
**TYPO-1** entra en resonancia con el lenguaje: deja de disparar palabras y
empieza a *pronunciar una sola*. El propulsor se calienta, el HUD cambia de
clave cromática, y el daño se transforma en un haz sostenido.

Narrativamente, FLUJO·LEX es el momento en que Kael se acerca, sin saberlo,
a la forma de combatir de Lyra Voss: *"como quien escribe un poema"*.
No es un poder extra — es una pista.
---

## 2. Justificación de diseño

El problema que resuelve este estado:

- Los **disparos** salen tan rápido como las teclas. Es correcto: la escritura
  ES la acción. No tiene sentido ralentizar la animación de salida del cañón
  ni la del impacto — rompería el contrato de "una tecla, una bala".
- El **propulsor** se intensifica con el WPM por la misma razón.
- El jugador rápido percibe entonces que su rendimiento *no se siente*.
  Las balas siempre se ven iguales aunque escriba a 40 o a 110 WPM.

FLUJO·LEX da forma visible a esa diferencia. La velocidad y la precisión
ya no solo determinan *cuántos* disparos salen, sino *qué tipo* de disparo
sale, *de qué color*, y *cómo se ve la cabina*. La temperatura es la
metáfora: del frío cian (estado base) al rojo del rayo (estado de flow).

---

## 3. Mecánica — La barra de FLUJO·LEX

### Posición en HUD
- Inmediatamente **debajo de la barra de HP**, esquina superior derecha.
- Mismo ancho que la barra de HP. Altura ligeramente menor.
- Etiqueta: `FLUJO·LEX` en mayúsculas, tracking amplio (coherente con `WPM`,
  `ACC`, `WAVE`).
- Ahora mismo se llama "CALOR-LEX" ese es el que debes cambiar

### Rango y unidades
- Valor interno: `flow ∈ [0, 100]`.
- Estado base: `flow = 0`.
- Estado FLUJO activo: `flow >= 100`.
- Mientras FLUJO está activo, la barra **drena** en lugar de subir.

### Subida (build-up)
La barra sube por dos fuentes que se suman:

| Fuente | Ganancia | Notas |
|---|---|---|
| Letra correcta | `+0.6` por letra | Base. Recompensa el flujo continuo. |
| Palabra completada | `+ (longitud × 0.8)` | Bonus por cierre limpio. |
| Combo de palabras sin error | `× (1 + combo × 0.05)` | Hasta `×1.5` (combo 10). |

**Modulación por WPM actual** (ventana deslizante, ya existe en motor):
- `WPM < 30` → ganancia × 0.6
- `WPM 30–60` → ganancia × 1.0
- `WPM 60–90` → ganancia × 1.4
- `WPM > 90` → ganancia × 1.8

Subir la barra requiere mantener **ritmo**, no solo precisión.

### Bajada (decay y penalizaciones)
| Causa | Efecto |
|---|---|
| Pausa sin tipear (>1.5 s) | `−4` por segundo |
| Letra incorrecta | `−6` |
| Palabra fallida (en Difícil: reset) | `−15` |
| Recibir impacto (`PLAYER_HIT`) | `−25` |

El decay por inactividad existe para que FLUJO·LEX nunca se acumule "a fuego
lento" — es un estado que se **gana** y se pierde en tiempo real.

### Activación
Al alcanzar `flow >= 100` se emite `FLOW_ENTER` y comienza el estado.
La transición es **instantánea pero anunciada** por un único frame de
flash blanco a verde en el HUD (no bloquea input).

### Duración y drenaje
- Mientras FLUJO·LEX está activo, la barra drena a `−12 / segundo`.
- Escribir sigue subiendo flow, pero con ganancia reducida `× 0.4`.
- Esto permite **extender** el estado escribiendo perfectamente, pero no
  perpetuarlo.
- Al llegar a `flow = 0`, se emite `FLOW_EXIT` y se vuelve al estado base.
- Cooldown de re-entrada: **3 segundos** tras `FLOW_EXIT`. Durante el cooldown
  la barra puede acumular pero no dispara `FLOW_ENTER` aunque llegue a 100.

---

## 4. Efectos del estado FLUJO·LEX activo

### 4.1 Curación de la nave
- Curación gradual: `+8 HP / segundo` mientras FLUJO esté activo.
- Tope: `PLAYER_MAX_HP` (100). No sobrecura.
- **No** cura instantáneamente al entrar al estado: la curación es la
  recompensa por *mantener* el flujo, no por alcanzarlo.

### 4.2 Modo de disparo: Rayo
El sistema de disparo cambia su contrato:

| | Estado base | FLUJO·LEX |
|---|---|---|
| Tipo | `Projectile` (bola de plasma) | `LexBeam` (haz sostenido) |
| Color | cian `#00ffcc` | rojo `#ff2244` |
| Origen | `_muzzle` de TYPO-1 | mismo `_muzzle` |
| Propagación | viaja a 35 u/s hasta target | impacto **instantáneo** sobre el target activo |
| Daño | 1 letra = 1 hit | 1 letra = 1 hit con `× 2.5` daño |
| Visual | esfera + estela corta | línea continua nave→enemigo, refrescada cada frame |

**Nota crítica de implementación:**
La animación del cañón (`Player.fireAnim()`) **no debe ralentizarse**.
El rayo es una `THREE.Line` que se redibuja cada frame mientras existan
letras correctas en cola. La salida del disparo sigue siendo 1:1 con la
tecla — solo cambia su forma visual y su daño.

### 4.3 Color del propulsor
El glow del motor (`Player._engineGlow`) ya pulsa con `recoil`. Se añade
una **rampa térmica** ligada al valor de `flow ∈ [0, 100]`:

| `flow` | Color emisivo del propulsor | Sensación |
|---|---|---|
| 0–25 | `#4466ff` (azul frío, valor actual) | helado |
| 25–50 | `#00ddff` (cian eléctrico) | activación |
| 50–75 | `#ffcc44` (ámbar) | calor |
| 75–100 | `#ff7722` (naranja) | sobrecarga |
| 100 (FLUJO activo) | `#ff2244` (rojo) | combustión |

La transición se hace por **interpolación lineal HSL** dentro del
`update(delta)` del Player, leyendo `flow` desde el bridge. Mismo
tratamiento al color de los proyectiles base mientras FLUJO no esté
activo: salen en el color del propulsor actual. Esto cierra visualmente
el bucle: lo que escribes calienta lo que dispara.

### 4.4 Velocidad del propulsor (efecto visual)
- La escala pulsante del `_engineGlow` ya existe.
- Se le suma una componente proporcional a `flow`:
  - `engineScale += flow / 100 × 0.4`
  - El motor "respira más fuerte" cuanto más caliente está.
- En FLUJO activo, se añade una **estela** detrás de la nave (cono o
  partículas finas) en color rojo, opacidad ligada a la barra restante.

### 4.5 Marco verde de la cabina (HUD inverso de advertencia)
Espejo del flash rojo de daño — pero como **bendición**, no advertencia.

| | Marco rojo (existente, daño) | Marco verde (FLUJO·LEX) |
|---|---|---|
| Trigger | `PLAYER_HIT` o palabra fallida | `FLOW_ENTER` y se mantiene durante el estado |
| Color | `#ff3333` | `#00ff88` |
| Forma | `radial-gradient` desde bordes | mismo gradient invertido (más intenso en bordes) |
| Animación | flash de 0.35 s | sostenido + pulso lento (1.2 s loop) |
| Opacidad | 1 → 0 rápido | constante en `0.45`, modulada por `flow / 100` |

**Implementación:** componente `<div className="frame-flow" />` montado
en `HUD.jsx`, que aparece mientras `state.flowActive === true`.
Se reutiliza el patrón visual de `.edge-flash` existente.

### 4.6 Word Box y cursor
- Borde del WordBox cambia a verde brillante (`#00ff88`) durante FLUJO.
- Cursor magenta actual sigue magenta — es identidad de marca, no estado.
- Las letras correctas ya completadas se quedan en verde
  (`#00ff88`, mismo color que ya usan).

### 4.7 Audio (sugerencia, no obligatorio)
- Capa de sintetizador armónico que entra al activarse FLUJO.
- Sale por crossfade al desactivarse.
- El sonido de disparo individual queda atenuado para que destaque el
  zumbido del rayo.

---

## 5. Progresión visual — De frío a caliente

Resumen cromático del bucle completo, ordenado por temperatura:

```
flow=0          flow=25         flow=50         flow=75         flow=100        FLUJO·LEX
azul frío   →   cian eléctrico → ámbar       →  naranja      →  punto crítico → rojo combustión
#4466ff         #00ddff          #ffcc44        #ff7722          #ff2244          rayo activo
```

El jugador *ve* su propio rendimiento subir antes de que el efecto se
active. Esa anticipación es parte de la gratificación.

---

## 6. Contrato técnico

### 6.1 Estado en bridge
Añadir a `_state` en `shared/bridge.js`:

```js
flow:        0,         // 0..100
flowActive:  false,     // true mientras dura FLUJO·LEX
flowCooldown: false,    // true durante 3s post-exit
```

### 6.2 Eventos nuevos
Añadir a `shared/eventTypes.js`:

```js
// --- Flow ---
FLOW_PROGRESS:   'flow:progress',    // { value, active }
FLOW_ENTER:      'flow:enter',       // { wpm }
FLOW_EXIT:       'flow:exit',        // { duration, wordsTyped }
FLOW_HEAL:       'flow:heal',        // { amount, hp }
```

### 6.3 Constantes nuevas
Añadir a `shared/constants.js`:

```js
// --- Flow ---
export const FLOW_MAX             = 100;
export const FLOW_GAIN_PER_LETTER = 0.6;
export const FLOW_DECAY_IDLE      = 4;     // por segundo
export const FLOW_DECAY_ACTIVE    = 12;    // por segundo en estado activo
export const FLOW_PENALTY_HIT     = 25;
export const FLOW_PENALTY_MISS    = 6;
export const FLOW_PENALTY_FAIL    = 15;
export const FLOW_HEAL_RATE       = 8;     // HP por segundo
export const FLOW_BEAM_DAMAGE_MULT = 2.5;
export const FLOW_COOLDOWN_MS     = 3000;

export const COLORS_FLOW = {
  RAMP: ['#4466ff', '#00ddff', '#ffcc44', '#ff7722', '#ff2244'],
  FRAME:        '#00ff88',
  BEAM:         '#ff2244',
  BEAM_GLOW:    '#ff6688',
};
```

### 6.4 Sistema responsable
La gestión de `flow` vive en `LexiconSystem.js` — es el sistema que ya
recibe input, mide WPM y conoce cada letra correcta/fallida. Es el lugar
natural donde acumular y drenar la barra.

`LexiconSystem.js` debe:
- Suscribirse a `KEY_TYPED`, `WORD_PROGRESS`, `WORD_COMPLETED`, `WORD_FAILED`,
  `PLAYER_HIT`.
- Mantener `_flow` y `_flowActive` internos.
- Emitir `FLOW_PROGRESS` (throttled a ~10 Hz, no por cada letra) hacia bridge.
- Emitir `FLOW_ENTER`, `FLOW_EXIT`, `FLOW_HEAL` puntualmente.
- Publicar `flow` y `flowActive` en `Bridge.setState()`.

### 6.5 Sistema de disparo
`SceneManager` (o donde se cree el `Projectile`) consulta `flowActive`
desde el bridge antes de instanciar:

- `flowActive = false` → `new Projectile(...)` (comportamiento actual).
- `flowActive = true` → `new LexBeam(origin, target, onHit)` — entidad nueva
  hermana de `Projectile` pero que aplica daño instantáneo y se renderiza
  como `THREE.Line` durante 80–120 ms. Misma firma de constructor para
  no romper el `SceneManager`.

`game/entities/LexBeam.js` debe seguir el patrón de `Projectile.js`:
extiende `Entity`, expone `addToScene` / `removeFromScene` / `update`.

### 6.6 Player.js — actualizar color de propulsor
En `update(delta)`, leer `Bridge.getState().flow` y mapearlo a la rampa
de color con interpolación HSL. El cambio se hace sobre `_engineGlow.material.emissive`
y, si `flowActive === false`, también sobre el flash y el color base de
los `Projectile` que cree el SceneManager.

### 6.7 HUD.jsx — añadir
- Componente `<FlowBar flow={flow} active={flowActive} />` debajo de
  `<HPBar />`.
- Marco `<div className="frame-flow" />` condicional.
- Animación `@keyframes frame-flow-pulse` en `styles.css`, espejo
  estructural de `edge-flash-red`.

---

## 7. Interacciones con sistemas existentes

| Sistema | Cambio |
|---|---|
| `LexiconSystem` | Añade lógica de flow. No cambia targeting ni WPM. |
| `Player` | Actualiza color emisivo del motor y del flash en cada frame. |
| `Projectile` | Sin cambios. Color leído desde fuera al instanciar. |
| `LexBeam` (nuevo) | Hermano de Projectile, daño instantáneo. |
| `SceneManager` | Decide qué clase instanciar según `flowActive`. |
| `HUD` | Renderiza `FlowBar` y `frame-flow`. |
| `bridge` / `eventTypes` / `constants` | Añadir campos y eventos descritos en §6. |

`game/` sigue sin importar de `app/`.
Toda comunicación pasa por `shared/bridge.js`. Regla intacta.

---

## 8. Balance — valores iniciales para tuning

Tabla resumen de números a ajustar tras playtests:

| Parámetro | Valor inicial | Notas |
|---|---|---|
| `FLOW_MAX` | 100 | Fijo. |
| Ganancia base por letra | 0.6 | Llegar a 100 a 60 WPM ≈ 25 s de tipeo limpio. |
| Multiplicador WPM>90 | 1.8 | Premia mucho a jugadores rápidos. |
| `FLOW_DECAY_IDLE` | 4/s | Pausar 25 s vacía la barra. |
| `FLOW_DECAY_ACTIVE` | 12/s | Estado dura ~8–12 s sin tipear; más si sigues escribiendo. |
| `FLOW_HEAL_RATE` | 8 HP/s | Estado de 10 s = 80 HP recuperados como máximo. |
| `FLOW_BEAM_DAMAGE_MULT` | 2.5× | Una palabra de 8 letras = 20 hits efectivos. |
| `FLOW_COOLDOWN_MS` | 3000 | Evita encadenar dos FLUJOs sin esfuerzo. |

**Objetivos de tuning por dificultad (alineado con `dificultad.md`):**
- Fácil: jugador medio entra a FLUJO·LEX al menos una vez por oleada 3.
- Medio: requiere oleada 4–5.
- Difícil ("Protocolo Lyra"): el FLUJO·LEX es escaso pero crítico para sobrevivir.

---

## 9. Principios respetados

- **La mecánica central nunca se interrumpe.** FLUJO·LEX no abre menús,
  no pausa input, no altera el WPM ni el targeting.
- **El texto es la UI.** El estado se comunica visualmente (color, marco,
  rayo) sin añadir widgets nuevos más allá de la barra.
- **Performance primero.** Una sola entidad nueva (`LexBeam`), interpolación
  HSL barata, eventos throttleados.
- **Narrativa integrada.** El estado *es* un guiño a Lyra. Si el jugador
  pregunta "¿por qué se calienta la nave?", la respuesta vive en el lore.

---

## 10. Roadmap de implementación sugerido

1. Añadir constantes y eventos (`constants.js`, `eventTypes.js`).
2. Añadir campos a `bridge.js`.
3. Implementar acumulación/decay en `LexiconSystem.js`. Verificar barra en HUD.
4. Implementar rampa de color del propulsor en `Player.js`.
5. Crear componente `FlowBar` y marco verde en `HUD.jsx` + `styles.css`.
6. Implementar `LexBeam.js` y switch en `SceneManager`.
7. Añadir curación durante FLUJO en `LexiconSystem.js` o sistema dedicado.
8. Tuning con playtests reales.

---

*Documento vivo. Actualizar conforme se ajuste el balance.*
