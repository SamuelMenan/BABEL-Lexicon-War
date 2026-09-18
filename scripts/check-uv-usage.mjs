// ¿Los TEXCOORD_2+ que ve audit-models.mjs los usa alguien de verdad?
//
// gltf-transform poda atributos sin usar por defecto (--prune-attributes true),
// asi que si siguen ahi despues de comprimir caben dos explicaciones: que algun
// material los referencie, o que la poda no llegara a correr. Esto lo distingue.
//
// Uso: node scripts/check-uv-usage.mjs

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const MODELS_DIR = join(process.cwd(), 'public', 'models');
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

// Todos los slots de textura de un material que llevan texCoord asociado.
const SLOTS = [
  'BaseColorTextureInfo', 'MetallicRoughnessTextureInfo', 'NormalTextureInfo',
  'OcclusionTextureInfo', 'EmissiveTextureInfo',
];

for (const name of readdirSync(MODELS_DIR).filter((f) => f.toLowerCase().endsWith('.glb'))) {
  const doc = await io.read(join(MODELS_DIR, name));
  const root = doc.getRoot();

  // texCoords que los materiales dicen usar.
  const used = new Set();
  for (const mat of root.listMaterials()) {
    for (const slot of SLOTS) {
      const info = mat[`get${slot}`]?.();
      if (info) used.add(info.getTexCoord());
    }
    // Extensiones (specular, sheen, transmission...) tambien pueden traer texCoord.
    for (const ext of mat.listExtensions()) {
      for (const key of Object.keys(ext)) {
        const v = ext[key];
        if (v && typeof v.getTexCoord === 'function') used.add(v.getTexCoord());
      }
    }
  }

  // texCoords que la geometria realmente trae.
  const present = new Set();
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const sem of prim.listSemantics()) {
        const m = sem.match(/^TEXCOORD_(\d+)$/);
        if (m) present.add(Number(m[1]));
      }
    }
  }

  const sobran = [...present].filter((i) => !used.has(i)).sort();
  const estado = sobran.length ? `SOBRAN: ${sobran.map((i) => 'TEXCOORD_' + i).join(', ')}` : 'todos en uso';
  console.log(
    name.slice(0, 44).padEnd(45),
    ('presentes[' + [...present].sort().join(',') + ']').padEnd(20),
    ('usados[' + [...used].sort().join(',') + ']').padEnd(16),
    estado,
  );
}
