# Prompt para Claude — Explosion/Colapso léxico de naves desde cero

Copia todo debajo de `---` y pégalo a Claude:

---

Necesito que construyas el sistema de explosión de naves "Colapso Léxico" desde cero para el juego BABEL Lexicon War. La explosión vieja ya fue eliminada. Aquí está todo el contexto del proyecto que necesitas.

## Contexto del proyecto

BABEL Lexicon War es un juego de tipeo donde letras y palabras son mecánicas de combate. El universo tiene un lore de "identidad digital fragmentada". Las explosiones NO deben ser fuego/humo genérico — deben ser **partículas de letras, glitch visual, y disolución de código**.

### Arquitectura de eventos existente (úsala, no la ignores)

- `shared/eventTypes.js` — catálogo central de eventos. Ya tiene `ENEMY_COLLAPSED`, `PLAYER_DIED`, `SHIP_FOCUS_CHANGED`.
- `shared/events.js` — `EventBus.on(type, cb)` / `EventBus.emit(type, payload)`.
- `game/core/CombatSceneManager.js` — ya escucha `WORD_COMPLETED` y `ENEMY_REACHED`. En `_onWordCompleted()` llama a `this._particles.burst(pos)`.

### Archivos clave que debes leer antes de escribir código

1. `game/rendering/ParticleEmitter.js` — pool de bursts de puntos. Ya tiene clase `Burst` con pooling O(1). Esta es la base donde añadirás el nuevo sistema.
2. `game/core/CombatSceneManager.js` — aquí integrarás las llamadas al nuevo FX.
3. `game/scenes/ShipSelectionScene.js` — el hangar. Tiene `_scene`, `_shipGroup`, y el loop de animación. Aquí también debe funcionar la explosión con un botón.
4. `shared/qualitySettings.js` — perfiles `low/mid/high` con `particleMaxBursts`, `particlePerBurst`. Añadirás nuevas propiedades de presupuesto aquí.
5. `game/entities/CombatEnemy.js` — tiene el color y geometría de cada tipo de enemigo (`CFGS.scout.color`, etc.). Úsalo para extraer el color base del enemigo al explotar.

---

## Qué construir

### PARTE 1 — Nuevo archivo: `game/rendering/fx/ShipDestroyFx.js`

Crea el archivo `game/rendering/fx/ShipDestroyFx.js` que exporta la clase `ShipDestroyFx`. Esta clase maneja UNA explosión completa. Se instancia, se activa, se actualiza por frame, y se limpia sola.

```javascript
export class ShipDestroyFx {
  constructor(scene, position, options = {}) { ... }
  // options: { color, word, intensity }
  
  spawn() { ... } // Activa todos los efectos
  update(delta) { ... } // Llama cada frame hasta que done === true
  cleanup() { ... } // Elimina de la escena, libera recursos
  
  get done() { ... } // true cuando todos los efectos terminaron
}
```

La explosión tiene **3 capas simultáneas**. Las 3 se inician al mismo tiempo con `spawn()`:

#### Capa 1: Partículas de puntos (base)
- ~60 partículas (mid) expandiéndose en esfera
- Velocidad inicial aleatoria, desaceleran con drag `(1 - t * 0.5)`
- Fade out a partir de `t = 0.4`
- Color: el del enemigo (se recibe en `options.color`)
- Usar `THREE.Points` con `THREE.PointsMaterial` y `AdditiveBlending`
- Añadir bloom layer: `points.layers.enable(BLOOM_LAYER)`

#### Capa 2: Fragmentos de letras/glifos (identidad BABEL)
- Tomar la `word` de `options.word` (la palabra del enemigo destruido)
- Para cada carácter de la palabra, crear un `THREE.Sprite` con una textura canvas que renderiza ese caracter en monospace bold verde/cyan (`#00ffcc`)
- Los sprites se lanzan en direcciones aleatorias con velocidad media
- Giran sobre su eje mientras vuelan
- Se desvanecen entre `t = 0.5` y `t = 1.0`
- Si `word` está vacío o no se pasa, usar glifos aleatorios: `['>', '_', '<', '|', '#', '/', '!', '?']`
- Máximo 8 sprites de letra (uno por caracter, máximo 8)
- Usar pool de canvas textures: crear 9 texturas únicas (A-Z mapeadas) y reutilizarlas

#### Capa 3: Flash de destello (impacto inmediato)
- En el momento del `spawn()`, crear un `THREE.Sprite` grande (escala 4-6) con color blanco/cyan
- El sprite dura solo 0.15 segundos, fade rápido
- Sirve como "flash" visual del impacto
- Usar misma textura de glow suave de `shared/softVisuals.js` (función `getSoftGlowTexture()`)

El efecto completo dura **2.5 segundos**. Cuando las 3 capas terminan, `done === true`.

---

### PARTE 2 — Actualizar `game/rendering/ParticleEmitter.js`

Añade el método `burstDestroy(position, options)` que internamente usa un pool de `ShipDestroyFx`:

```javascript
// En el constructor, añadir:
// this._destroyPool = pool de 4 ShipDestroyFx pre-instanciados
// (pero NO llamar spawn en el constructor, solo construirlos)

burstDestroy(position, { color = 0x00ffcc, word = '', intensity = 1.0 } = {}) {
  // Busca un slot libre en el pool
  // Si no hay, ignora (no crear más de 4 simultáneos)
  // Activa el slot: fx.spawn()
}
```

El pool de `ShipDestroyFx` funciona igual que el pool de `Burst` existente: free-list con índices.

Actualiza `update(delta)` para iterar el destroyPool y llamar `fx.update(delta)`.
Actualiza `dispose()` para limpiar el destroyPool.

Presupuesto por calidad (añadir a `shared/qualitySettings.js`):
```javascript
low:  { destroyPoolSize: 2, destroyLetterCount: 4 }
mid:  { destroyPoolSize: 4, destroyLetterCount: 8 }
high: { destroyPoolSize: 6, destroyLetterCount: 12 }
```

---

### PARTE 3 — Integrar en `game/core/CombatSceneManager.js`

En `_onWordCompleted({ enemyId })`, reemplaza la llamada actual:
```javascript
// ANTES:
this._particles.burst(enemy.position.clone());

// DESPUÉS:
this._particles.burstDestroy(enemy.position.clone(), {
  color: enemy._cfg?.color ?? 0x00ffcc,
  word:  enemy.word,
  intensity: 1.0,
});
```

En `_onEnemyReached({ id })`, cuando el enemigo alcanza al jugador:
```javascript
// Añadir junto al burst existente:
this._particles.burstDestroy(enemy.position.clone(), {
  color: 0xff4444, // rojo de daño
  word:  enemy.word,
  intensity: 0.7,
});
```

---

### PARTE 4 — Integrar en `game/scenes/ShipSelectionScene.js` (Hangar)

El hangar debe poder detonar la explosión de la nave actual cuando se presione un botón. Esto es solo para visualización/preview.

1. Añade import de `ShipDestroyFx` al inicio del archivo.

2. Añade `this._destroyFx = null;` en el constructor.

3. Añade método público `detonateCurrentShip()`:
```javascript
detonateCurrentShip() {
  // Si ya hay uno activo, cancélalo y límpialo
  if (this._destroyFx && !this._destroyFx.done) {
    this._destroyFx.cleanup();
  }
  
  // Tomar el nombre de la nave actual como "word"
  const currentShip = SHIPS[this._currentShipIndex ?? 0];
  const word = currentShip?.name ?? 'BABEL';
  
  // La posición es el centro de la nave (0, 0, 0) más el SHIP_SPAWN_OFFSET
  const pos = new THREE.Vector3(0, SHIP_SPAWN_OFFSET.y, 0);
  
  this._destroyFx = new ShipDestroyFx(this._scene, pos, {
    color: 0x00eeff,
    word,
    intensity: 1.2,
  });
  this._destroyFx.spawn();
}
```

4. En el loop de animación `_startLoop()`, dentro de `animate()`, antes de `this._composer.render()`:
```javascript
if (this._destroyFx && !this._destroyFx.done) {
  this._destroyFx.update(0.016);
}
```

5. En `destroy()`, limpiar: `this._destroyFx?.cleanup(); this._destroyFx = null;`

---

### PARTE 5 — Tecla en el Hangar: `app/components/hangar/HangarScreen.jsx`

En el `onKeyDown` handler que ya existe (donde están Home, End, PageUp, PageDown), añade:
```javascript
if (e.key === 'Delete') sceneRef.current?.detonateCurrentShip();
```

La tecla `Delete` activa la explosión de previsualización de la nave actual en el hangar.

---

## Reglas importantes

1. **No usar `setInterval` ni `setTimeout` dentro de los FX** — todo debe actualizarse en el loop via `update(delta)`.
2. **Pool, no instancias nuevas cada frame** — las geometrías, materiales y canvas textures se crean una vez y se reutilizan.
3. **No tocar `BoosterEffect.js` ni `BoosterConfig.js`** — son sistemas independientes.
4. **No cambiar la arquitectura de eventos** — usa `EventBus` si necesitas comunicación, no callbacks directos entre escenas.
5. **Bloom layer en todos los meshes de FX**: `mesh.layers.enable(BLOOM_LAYER)` donde `BLOOM_LAYER` viene de `import { BLOOM_LAYER } from '../../shared/constants.js'`.
6. **El efecto en el hangar es puramente visual** — no dispara eventos de EventBus, no afecta el estado del juego.
