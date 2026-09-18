// Auditoria de los .glb: reparto disco vs VRAM, UV sets y triangulos.
//
// Motivo: tras meshopt + webp el tamano EN DISCO ya no es el problema. Lo que
// no se ve en el explorador de archivos es que una textura webp de 1024x1024
// se descomprime a RGBA crudo al subirla a la GPU: ~5,6 MB por textura,
// independientemente de lo que pesara el fichero.
//
// Uso: node scripts/audit-models.mjs

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const MODELS_DIR = join(process.cwd(), 'public', 'models');
const mb = (b) => (b / 1048576);

// RGBA sin comprimir + mipmaps (~1,333x el nivel base).
const gpuBytes = (w, h) => w * h * 4 * (4 / 3);

// Los .glb ya vienen con EXT_meshopt_compression: sin el decodificador no se
// pueden ni abrir.
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const rows = [];

for (const name of readdirSync(MODELS_DIR).filter((f) => f.toLowerCase().endsWith('.glb'))) {
  const path = join(MODELS_DIR, name);
  let doc;
  try {
    doc = await io.read(path);
  } catch (e) {
    console.error(`  no se pudo leer ${name}: ${e.message}`);
    continue;
  }
  const root = doc.getRoot();

  let vram = 0;
  let maxDim = 0;
  const textures = root.listTextures();
  for (const t of textures) {
    const size = t.getSize();
    if (!size) continue;
    vram += gpuBytes(size[0], size[1]);
    maxDim = Math.max(maxDim, size[0], size[1]);
  }

  let tris = 0;
  let extraUV = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      tris += (idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3;
      // TEXCOORD_2 en adelante casi nunca se usa en PBR estandar.
      for (let i = 2; i < 8; i++) {
        const uv = prim.getAttribute(`TEXCOORD_${i}`);
        if (uv) extraUV += uv.getCount() * 2 * 4;   // vec2 float32 equivalente
      }
    }
  }

  rows.push({
    name,
    disk: mb(statSync(path).size),
    vram: mb(vram),
    tex: textures.length,
    maxDim,
    tris: Math.round(tris),
    extraUV: mb(extraUV),
  });
}

rows.sort((a, b) => b.vram - a.vram);

console.log('modelo'.padEnd(46), 'disco'.padStart(8), 'VRAM'.padStart(9), 'tex'.padStart(5), 'max'.padStart(6), 'tris'.padStart(9), 'UV 2+'.padStart(8));
console.log('-'.repeat(96));
for (const r of rows) {
  console.log(
    r.name.slice(0, 45).padEnd(46),
    (r.disk.toFixed(1) + ' MB').padStart(8),
    (r.vram.toFixed(1) + ' MB').padStart(9),
    String(r.tex).padStart(5),
    String(r.maxDim).padStart(6),
    r.tris.toLocaleString('es').padStart(9),
    (r.extraUV.toFixed(2) + ' MB').padStart(8),
  );
}
const tot = rows.reduce((a, r) => ({ disk: a.disk + r.disk, vram: a.vram + r.vram, tris: a.tris + r.tris }), { disk: 0, vram: 0, tris: 0 });
console.log('-'.repeat(96));
console.log(
  'TOTAL'.padEnd(46),
  (tot.disk.toFixed(1) + ' MB').padStart(8),
  (tot.vram.toFixed(1) + ' MB').padStart(9),
  ''.padStart(5), ''.padStart(6),
  tot.tris.toLocaleString('es').padStart(9),
);
