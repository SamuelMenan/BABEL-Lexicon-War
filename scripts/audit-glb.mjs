// Inspecciona estructura de un GLB sin three.js. Lee header + chunk JSON.
// Uso: node scripts/audit-glb.mjs <ruta.glb>

import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/audit-glb.mjs <ruta.glb>'); process.exit(1); }

const buf = fs.readFileSync(file);
const magic = buf.toString('ascii', 0, 4);
if (magic !== 'glTF') { console.error('no es GLB válido'); process.exit(1); }
const version = buf.readUInt32LE(4);
const totalLen = buf.readUInt32LE(8);

// chunk 0 = JSON
const chunk0Len  = buf.readUInt32LE(12);
const chunk0Type = buf.toString('ascii', 16, 20);
const chunk0Data = buf.slice(20, 20 + chunk0Len);
const json = JSON.parse(chunk0Data.toString('utf8'));

// chunk 1 = BIN (puede no estar)
let binLen = 0;
const c1Off = 20 + chunk0Len;
if (c1Off < buf.length) binLen = buf.readUInt32LE(c1Off);

const out = {
  file,
  bytes: buf.length,
  glbVersion: version,
  glbTotalLen: totalLen,
  jsonChunkBytes: chunk0Len,
  binChunkBytes: binLen,
  asset: json.asset,
  counts: {
    scenes:     json.scenes?.length ?? 0,
    nodes:      json.nodes?.length ?? 0,
    meshes:     json.meshes?.length ?? 0,
    materials:  json.materials?.length ?? 0,
    textures:   json.textures?.length ?? 0,
    images:     json.images?.length ?? 0,
    animations: json.animations?.length ?? 0,
    skins:      json.skins?.length ?? 0,
    cameras:    json.cameras?.length ?? 0,
  },
  defaultScene: json.scene,
  scenes: json.scenes?.map((s, i) => ({
    index: i,
    name: s.name ?? null,
    rootNodes: s.nodes ?? [],
  })),
  // Topología de nodos con nombres
  nodes: json.nodes?.map((n, i) => ({
    i,
    name: n.name ?? null,
    mesh: n.mesh ?? null,
    children: n.children ?? [],
    translation: n.translation ?? null,
    rotation:    n.rotation ?? null,
    scale:       n.scale ?? null,
    extras: n.extras ?? null,
  })),
  meshes: json.meshes?.map((m, i) => ({
    i,
    name: m.name ?? null,
    primCount: m.primitives?.length ?? 0,
    primitives: m.primitives?.map((p, pi) => ({
      pi,
      material: p.material ?? null,
      attributes: Object.keys(p.attributes ?? {}),
      hasIndices: 'indices' in p,
      mode: p.mode ?? 4,  // 4 = TRIANGLES
    })),
  })),
  animations: json.animations?.map((a, i) => ({
    i,
    name: a.name ?? null,
    channels: a.channels?.length ?? 0,
    samplers: a.samplers?.length ?? 0,
  })),
  materials: json.materials?.map((m, i) => ({
    i,
    name: m.name ?? null,
    alphaMode: m.alphaMode ?? 'OPAQUE',
    pbr: m.pbrMetallicRoughness ? {
      baseColor: m.pbrMetallicRoughness.baseColorFactor,
      metallic:  m.pbrMetallicRoughness.metallicFactor,
      rough:     m.pbrMetallicRoughness.roughnessFactor,
    } : null,
    emissive: m.emissiveFactor,
  })),
};

// Construir mapa parent → para identificar profundidad y traversal
const parentOf = new Array(out.counts.nodes).fill(null);
out.nodes?.forEach(n => n.children.forEach(c => { parentOf[c] = n.i; }));

// Render árbol simple
function tree(idx, depth = 0, out = []) {
  const n = json.nodes[idx];
  const indent = '  '.repeat(depth);
  const meshName = n.mesh != null ? json.meshes[n.mesh]?.name : null;
  out.push(`${indent}#${idx} "${n.name ?? ''}"${n.mesh != null ? ` [mesh:${n.mesh}${meshName ? ' "' + meshName + '"' : ''}]` : ''}${n.translation ? ` T:[${n.translation.map(v => v.toFixed(2)).join(',')}]` : ''}${n.scale ? ` S:[${n.scale.map(v => v.toFixed(2)).join(',')}]` : ''}`);
  (n.children || []).forEach(c => tree(c, depth + 1, out));
  return out;
}
const sceneIdx = out.defaultScene ?? 0;
const rootIds = json.scenes?.[sceneIdx]?.nodes ?? [];
const treeLines = [];
rootIds.forEach(r => tree(r, 0, treeLines));

console.log(JSON.stringify(out, null, 2));
console.log('\n=== NODE TREE ===');
console.log(treeLines.join('\n'));

// Heurística: identificar "ship-like" + "hole-like" por nombre
const HOLE_HINTS = ['hole','blackhole','singular','vortex','core','event','horizon','center','sink','drain'];
const SHIP_HINTS = ['ship','craft','rocket','vehicle','plane','jet'];
function hits(name, list) { if (!name) return false; const n = name.toLowerCase(); return list.some(h => n.includes(h)); }

console.log('\n=== HEURÍSTICAS DE NOMBRES ===');
console.log('Hole/center candidates:');
out.nodes?.forEach(n => { if (hits(n.name, HOLE_HINTS)) console.log(`  #${n.i} "${n.name}" T:${JSON.stringify(n.translation)}`); });
out.meshes?.forEach(m => { if (hits(m.name, HOLE_HINTS)) console.log(`  mesh #${m.i} "${m.name}"`); });
console.log('Ship candidates (que se ocultan actualmente):');
out.nodes?.forEach(n => { if (hits(n.name, SHIP_HINTS)) console.log(`  #${n.i} "${n.name}" T:${JSON.stringify(n.translation)}`); });
out.meshes?.forEach(m => { if (hits(m.name, SHIP_HINTS)) console.log(`  mesh #${m.i} "${m.name}"`); });
