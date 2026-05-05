# Prompt para Claude — Corregir posicionamiento de boosters en el Hangar

Copia todo debajo de la línea `---` y pégalo a Claude:

---

Tengo un problema con los boosters de las naves en el hangar. Los boosters aparecen en el LATERAL de las naves en vez de en la parte trasera. Necesito tu ayuda para diagnosticarlo y corregirlo.

## El problema raíz

En `game/scenes/ShipSelectionScene.js`, la nave se carga así:
```javascript
gltf.scene.position.set(-center.x, -center.y, -center.z); // centra el modelo
const wrapper = new THREE.Group();
wrapper.add(gltf.scene);
wrapper.scale.setScalar(scale);       // escala uniforme
wrapper.rotation.set(0, ship.rotationY, 0); // rota para que la nariz apunte bien
```

El booster se adjunta al `wrapper`. El problema es que `wrapper.rotation.y` rota tanto el modelo como el booster. Cuando pongo el booster en `z = 1.0 * halfSize.z`, el booster va al borde del eje Z nativo del modelo, pero ese eje Z NO corresponde al "trasero" visual de la nave (que ya fue girada con rotationY).

Cada modelo .glb fue exportado con una orientación nativa distinta. El `rotationY` en `shared/constants.js` ya fue calibrado para que cada nave VISUALMENTE apunte en la dirección correcta. Pero la posición del booster necesita estar en el eje nativo del modelo (pre-rotación), no en coordenadas de pantalla.

## La solución: helpers de debug + ajuste manual

### Paso 1: Agrega helpers de debug temporales en `loadShip()`

Después de crear el wrapper y antes de `this._saveModelOriginals(wrapper)`, agrega esferas de colores en los 6 extremos del bounding box del modelo. Esto me permitirá ver visualmente dónde está cada eje del modelo y encontrar la dirección correcta para el booster.

```javascript
// === DEBUG: Mostrar ejes del bounding box del modelo ===
const halfX = size.x / 2;
const halfY = size.y / 2;
const halfZ = size.z / 2;
const debugSphereGeo = new THREE.SphereGeometry(size.x * 0.03, 8, 8);
const markers = [
  { pos: [halfX, 0, 0],  color: 0xff0000, label: '+X rojo' },
  { pos: [-halfX, 0, 0], color: 0x880000, label: '-X rojo oscuro' },
  { pos: [0, halfY, 0],  color: 0x00ff00, label: '+Y verde' },
  { pos: [0, -halfY, 0], color: 0x008800, label: '-Y verde oscuro' },
  { pos: [0, 0, halfZ],  color: 0x0000ff, label: '+Z azul' },
  { pos: [0, 0, -halfZ], color: 0x000088, label: '-Z azul oscuro' },
];
markers.forEach(m => {
  const mat = new THREE.MeshBasicMaterial({ color: m.color });
  const sphere = new THREE.Mesh(debugSphereGeo, mat);
  sphere.position.set(...m.pos);
  sphere.name = `debug_${m.label}`;
  wrapper.add(sphere);
});
console.log(`[DEBUG] ${ship.id} | size: x=${size.x.toFixed(1)} y=${size.y.toFixed(1)} z=${size.z.toFixed(1)} | rotationY=${ship.rotationY}`);
// === FIN DEBUG ===
```

### Paso 2: Examina el resultado visual

Con las esferas de colores, podré ver en pantalla cuál esfera está en el "trasero" de cada nave. Por ejemplo:
- Si la esfera AZUL (+Z) está en la parte trasera → el booster va en `z: +1.0`
- Si la esfera ROJA (+X) está en la trasera → el booster va en `x: +1.0, z: 0`
- Si la esfera AZUL OSCURO (-Z) está en la trasera → el booster va en `z: -1.0`

### Paso 3: Sistema de posicionamiento actual

El código actual en `loadShip()` calcula la posición del booster así (ya implementado):
```javascript
const halfSize = size.clone().multiplyScalar(0.5);
// localPosition es fracción del half-size
const scaledPos = new THREE.Vector3(
  config.localPosition.x * halfSize.x,
  config.localPosition.y * halfSize.y,
  config.localPosition.z * halfSize.z,
);
```

Los configs están en `game/rendering/booster/BoosterConfig.js` con nombres `hangar_{shipId}_{index}`.

### Paso 4: Lo que necesito que hagas ahora

1. Añade el código de debug (esferas de colores) en `loadShip()` de `ShipSelectionScene.js` justo después de `this._shipGroup.add(wrapper)` y antes de la sección de boosters.
2. NO elimines ni modifiques la lógica actual de boosters, solo agrega los debug markers.
3. Asegúrate de que las esferas sean proporcionales al tamaño del modelo para que se vean bien.
4. Añade el `console.log` con las dimensiones del bounding box para cada nave.

Una vez que pueda ver las esferas, te diré cuál eje corresponde al "trasero" de cada nave y actualizaremos los configs con las coordenadas correctas.
