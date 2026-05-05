# Prompt para Claude — Agregar Boosters a todas las naves del Hangar

Copia todo el contenido debajo de la línea `---` y pégalo a Claude:

---

Necesito agregar propulsores (boosters) visuales a todas las naves en la pantalla de selección del Hangar (`game/scenes/ShipSelectionScene.js`). El sistema de boosters ya existe y funciona — solo necesito extenderlo.

## Archivos clave (léelos primero)

1. `game/rendering/BoosterEffect.js` — clase BoosterEffect, usa `new BoosterEffect(config)` → `attachToShip(group)` → `update(delta, isAccelerating)`
2. `game/rendering/booster/BoosterConfig.js` — objeto `SHIP_BOOSTER_CONFIGS` con configs existentes (`combatPlayer`, `racingPlayer`, `racingOpponent`). Usa esas como referencia de estructura.
3. `game/scenes/ShipSelectionScene.js` — método `loadShip(index)` es donde se carga cada nave. El wrapper del modelo se escala con `2.2 / maxDim`.
4. `shared/constants.js` — array `SHIPS` con los IDs de cada nave.

## Qué hacer

### A) En `BoosterConfig.js`: agregar configs de hangar por nave

Añade al objeto `SHIP_BOOSTER_CONFIGS` las configs para cada nave del hangar. Usa la estructura existente como template. Las `localPosition` son coordenadas locales del modelo SIN escalar. Define cada config como `hangar_{shipId}_{index}` (ej: `hangar_spaceship_0`, `hangar_spaceship_1`).

Especificaciones por nave:

| Ship ID | # Boosters | Color | Disposición | Notas |
|---------|-----------|-------|-------------|-------|
| `spaceship` | 2 | Amarillo (0xffcc44) | Lado a lado horizontal en la trasera | Reemplaza las luces amarillas actuales del modelo |
| `spaceshipnew` | 1 | Azul (0x86e8ff) | Centro trasera | Reusar `combatPlayer` reducido |
| `cb1` | 0 | — | — | NO agregar boosters. Este modelo tiene animaciones propias de propulsores que están pausadas. Solo hay que activarlas (ver sección C). |
| `ig127` | 4 | Rojo (0xff4422) | 2 arriba + 2 abajo, formación cuadrada | Propulsores pequeños |
| `lowpoly` | 1 | Violeta oscuro (0x6622aa) | Centro trasera, tenue y pequeño | Nave espía sigilosa, el booster debe ser discreto |
| `colaid1` | 6 | Cyan/turquesa (0x44ffee) | Distribuidos irregularmente: 2 superiores exteriores, 2 inferiores interiores, 2 medios | Nave exploradora muy visible. Usa la imagen de referencia: tiene 6 toberas visibles en la parte trasera |
| `waldeinsamkeit` | 1 | Naranja intenso (0xff6622) | Centro trasera, GRANDE | Nave destructiva, un solo motor enorme. `bodyRadius: 0.25, bodyLength: 1.5` |

### B) En `ShipSelectionScene.js`: crear y actualizar boosters al cargar nave

1. Añade `import { BoosterEffect, SHIP_BOOSTER_CONFIGS } from '../rendering/BoosterEffect.js';` al inicio.

2. En el constructor, añade: `this._boosters = [];`

3. En `loadShip()`, después de `this._shipGroup.add(wrapper)` y antes de `this._saveModelOriginals`:
   - Limpia boosters anteriores: `this._boosters.forEach(b => b.dispose()); this._boosters = [];`
   - Busca todas las configs que empiecen con `hangar_{ship.id}` en `SHIP_BOOSTER_CONFIGS`
   - Para cada config encontrada, crea un `new BoosterEffect(config)`, llama `attachToShip(wrapper)`, y guárdalo en `this._boosters`
   - Caso especial para `cb1`: NO crear boosters, en su lugar buscar `AnimationMixer` del gltf y reproducir todas las animaciones (`gltf.animations`). Guarda el mixer en `this._mixers`.

4. En `_startLoop()` dentro de `animate()`, antes de `this._composer.render()`, añade:
   ```javascript
   // Update hangar boosters (idle thruster effect)
   this._boosters.forEach(b => b.update(0.016, false, 0.8, 0.8, false));
   ```

5. En `destroy()`, añade: `this._boosters.forEach(b => b.dispose()); this._boosters = [];`

6. Actualiza también los mixers en el loop:
   ```javascript
   this._mixers.forEach(m => m?.update(0.016));
   ```

### C) Caso especial: CB-1 Phantom (id: 'cb1')

Este modelo ya tiene animaciones de propulsores integradas en el archivo .glb. En `loadShip()`, cuando `ship.id === 'cb1'`:
- Crea un `THREE.AnimationMixer(gltf.scene)`
- Recorre `gltf.animations` y para cada clip haz `mixer.clipAction(clip).play()`
- Guarda el mixer en `this._mixers` para que se actualice en el loop

### D) En `shared/constants.js`: renombrar nave

Cambia el nombre de la nave `lowpoly` de `'Forma Reducida'` a `'Acechador Nocturno'`.

## Reglas importantes

- NO modifiques `BoosterEffect.js` ni `BoosterAnimation.js` — solo agrega configs y úsalas.
- Las posiciones de los boosters son aproximadas. El usuario las ajustará manualmente después.
- Los boosters del hangar son puramente visuales (idle), no necesitan reaccionar a aceleración ni flow.
- Limpia bien los boosters cuando se cambia de nave (`disposeGroup` ya limpia el wrapper, pero los BoosterEffect tienen su propio `dispose()`).
