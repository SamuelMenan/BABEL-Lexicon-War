// Comprime los modelos .glb pesados con gltf-transform: cuantizacion + meshopt
// (geometria) + texturas webp. NO usa simplify/join/flatten/weld/instance, asi
// que la geometria, el grafo de escena y el rigging/animacion (p.ej. cb1) se
// preservan — es una recompresion casi sin perdida visible, no una decimacion.
//
// Reversible: el original pristino se respalda en public/models/_originals/ y
// SIEMPRE se comprime desde ese respaldo, por lo que correr el script dos veces
// no recomprime sobre lo ya comprimido (idempotente). Para revertir: copiar de
// _originals/ de vuelta a public/models/.
//
// Uso:  node scripts/compress-models.mjs            (todos)
//       node scripts/compress-models.mjs waldeins   (filtra por subcadena)
//
// El runtime ya decodifica meshopt: ver game/core/gltfLoader.js (setMeshoptDecoder).
// webp lo decodifica el navegador de forma nativa.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const MODELS_DIR = join(process.cwd(), 'public', 'models');
// FUERA de public/ — vite copia public/ a dist/, no queremos shippear los
// originales sin comprimir.
const BACKUP_DIR = join(process.cwd(), '.model-originals');

// Modelos pesados que existen en disco y se usan en el juego.
const TARGETS = [
  'waldeinsamkeit-class_strategic_survey_vessel.glb', // ship 63MB
  'spaceship_-_cb1.glb',                              // ship animado 34MB
  'spacestation_7_-_procedural.glb',                  // hangar env 35MB
  'truth_about_the_dark_side_of_the_moon.glb',        // moon 26MB
  'spaceship.glb',                                    // ship 5.4MB
  'spaceshipnew.glb',                                 // ship 3.4MB
  'spaceship__low_poly.glb',                          // ship 3.3MB
  'rebels_x-wing_starfighter.glb',                    // ship secreto 59MB
];

// Modelos cuyo .glb fuente trae materiales con alphaMode:BLEND por error de
// export (Sketchfab/Blender) → se ven semi-transparentes/huecos en runtime.
// Para estos forzamos alphaMode:OPAQUE ANTES de comprimir (sobre el original
// sin meshopt, IO simple). No es un bug de compresion: el original ya viene mal.
const FORCE_OPAQUE = new Set([
  'rebels_x-wing_starfighter.glb',
]);

// Reescribe `src` → `dst` con todos los materiales en alphaMode OPAQUE.
// Devuelve cuantos materiales cambio.
async function forceOpaqueMaterials(src, dst) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(src);
  let changed = 0;
  for (const m of doc.getRoot().listMaterials()) {
    if (m.getAlphaMode() !== 'OPAQUE') { m.setAlphaMode('OPAQUE'); changed++; }
  }
  await io.write(dst, doc);
  return changed;
}

const mb = (b) => (b / 1024 / 1024).toFixed(1) + 'MB';
const filter = process.argv[2];

mkdirSync(BACKUP_DIR, { recursive: true });

let totalBefore = 0;
let totalAfter = 0;

for (const name of TARGETS) {
  if (filter && !name.includes(filter)) continue;

  const live   = join(MODELS_DIR, name);
  const backup = join(BACKUP_DIR, name);

  if (!existsSync(live) && !existsSync(backup)) {
    console.log(`SKIP (missing): ${name}`);
    continue;
  }

  // Respaldar original pristino la primera vez; despues comprimir siempre desde el.
  if (!existsSync(backup)) {
    copyFileSync(live, backup);
    console.log(`backup → .model-originals/${name}`);
  }

  const before = statSync(backup).size;

  // Paso previo opcional: forzar materiales OPAQUE (sobre el original) → temp,
  // y comprimir desde ese temp. Asi el arreglo sobrevive a cualquier recompresion.
  let optimizeSrc = backup;
  let tmpFile = null;
  if (FORCE_OPAQUE.has(name)) {
    tmpFile = join(MODELS_DIR, name.replace(/\.glb$/i, '.opaque-tmp.glb'));
    const n = await forceOpaqueMaterials(backup, tmpFile);
    console.log(`  alphaMode → OPAQUE en ${n} materiales (${name})`);
    optimizeSrc = tmpFile;
  }

  console.log(`compress: ${name} (${mb(before)}) …`);
  // Comando como string con rutas entre comillas (las rutas tienen espacios:
  // "BABEL Lexicon War"). Flags booleanos en false desactivan todo lo que
  // alteraria geometria/animacion — solo meshopt + webp.
  const cmd = [
    'npx -y @gltf-transform/cli@latest optimize',
    `"${optimizeSrc}"`, `"${live}"`,
    '--compress meshopt --texture-compress webp',
    '--simplify false --weld false --join false --flatten false --instance false --palette false',
  ].join(' ');
  execSync(cmd, { stdio: 'inherit' });
  // Limpieza del temp opaco. En Windows el subproceso de npx puede mantener el
  // lock un instante (EBUSY) — reintentar/silenciar; el archivo `live` ya esta ok.
  if (tmpFile && existsSync(tmpFile)) {
    try { unlinkSync(tmpFile); } catch { try { unlinkSync(tmpFile); } catch { /* leftover; borrar manual */ } }
  }

  const after = statSync(live).size;
  totalBefore += before;
  totalAfter  += after;
  console.log(`  ${basename(name)}: ${mb(before)} → ${mb(after)}  (-${(100 * (1 - after / before)).toFixed(0)}%)\n`);
}

console.log(`TOTAL: ${mb(totalBefore)} → ${mb(totalAfter)}  (-${totalBefore ? (100 * (1 - totalAfter / totalBefore)).toFixed(0) : 0}%)`);
console.log('Revertir: copiar .model-originals/* → public/models/');
