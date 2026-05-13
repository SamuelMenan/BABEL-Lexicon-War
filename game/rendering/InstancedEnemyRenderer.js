// InstancedMesh renderer del enjambre.
// Dibuja N enemigos del MISMO TIPO en 1 draw call por capa (hull / core / rings).
// Reemplaza al stack { LineSegments + Mesh core + Sprite glow + N rings } por instancia.
//
// Estrategia:
//   - 1 InstancedMesh por (type, layer). 5 types × 3 layers = 15 draw calls totales máx.
//   - Posición/rotación/scale → setMatrixAt(i, matrix). Color por instancia → setColorAt.
//   - El CombatEnemy se reduce a un "logical entity" (sin mesh propio). InstancedEnemyRenderer
//     itera enemies activos y compone matrices cada frame.
//   - Glow sprite se reemplaza por un additive billboard instanced (PlaneGeometry × InstancedMesh).
//
// Trade-offs:
//   - Cambio dinámico de color (targeted) vía `instanceColor` + `instanceMatrix.needsUpdate`.
//   - LineSegments NO soporta InstancedMesh nativo en three; opciones:
//       a) Mesh wireframe shader (custom),
//       b) instanced LineSegmentsGeometry (three/addons/lines/LineSegmentsGeometry) — soporta instancing barato,
//       c) saltar wireframe en LOD bajo (recomendado).
//
// Para iGPU recomendado: fase inicial usa (c) — drop wireframes en tier low.

import * as THREE from 'three';
import { CFGS, ENEMY_TYPES } from '../data/enemyConfigs.js';
import { BLOOM_LAYER } from '../../shared/constants.js';

const TYPES = Object.values(ENEMY_TYPES);
const MAX_INSTANCES_PER_TYPE = 200;

export class InstancedEnemyRenderer {
  constructor(scene) {
    this._scene  = scene;
    // dummy reutilizable para componer matrices
    this._dummy  = new THREE.Object3D();
    this._color  = new THREE.Color();
    // Buckets por type
    this._hullMesh  = {};  // {type: InstancedMesh wireframe-style}
    this._coreMesh  = {};  // {type: InstancedMesh sphere}
    this._ringMesh  = {};  // {type: InstancedMesh[]} (uno por anillo)
    // Indices por type — se reasignan cada frame
    this._counts    = {};
    this._enemiesByType = {};
  }

  init() {
    for (const t of TYPES) {
      const cfg = CFGS[t];

      // Hull: usar la propia geo en wireframe via MeshBasicMaterial({ wireframe:true })
      // — barato y soporta instancing nativo (vs LineSegments).
      const hullGeo = cfg.geo();
      const hullMat = new THREE.MeshBasicMaterial({
        color: cfg.color, wireframe: true,
        transparent: true, opacity: cfg.hullOpacity ?? 0.9,
      });
      const hull = new THREE.InstancedMesh(hullGeo, hullMat, MAX_INSTANCES_PER_TYPE);
      hull.count = 0;
      hull.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      hull.layers.enable(BLOOM_LAYER);
      hull.frustumCulled = false; // matrices se actualizan manual
      this._scene.add(hull);
      this._hullMesh[t] = hull;

      // Core: esfera unidad escalada por cfg.coreR
      const coreGeo = new THREE.SphereGeometry(1, 6, 6); // <= LOD reducido
      const coreMat = new THREE.MeshBasicMaterial({
        color: cfg.color, transparent: true, opacity: 0.85,
      });
      const core = new THREE.InstancedMesh(coreGeo, coreMat, MAX_INSTANCES_PER_TYPE);
      core.count = 0;
      core.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      core.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(MAX_INSTANCES_PER_TYPE * 3), 3
      );
      core.layers.enable(BLOOM_LAYER);
      core.frustumCulled = false;
      this._scene.add(core);
      this._coreMesh[t] = core;

      // Rings: 1 InstancedMesh por anillo (definición compartida del cfg)
      const rings = [];
      for (const rd of cfg.rings) {
        const rg  = new THREE.TorusGeometry(rd.r, rd.tube, 6, 18); // segments bajos
        const rmt = new THREE.MeshBasicMaterial({ color: cfg.color });
        const rim = new THREE.InstancedMesh(rg, rmt, MAX_INSTANCES_PER_TYPE);
        rim.count = 0;
        rim.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        rim.userData.def = rd;
        rim.layers.enable(BLOOM_LAYER);
        rim.frustumCulled = false;
        this._scene.add(rim);
        rings.push(rim);
      }
      this._ringMesh[t] = rings;

      this._counts[t] = 0;
      this._enemiesByType[t] = [];
    }
  }

  // Llamado cada frame con lista de enemigos lógicos.
  // enemy: { _type, _group(opt), position:Vector3, rotation:Euler, _t, targeted, active, _cfg }
  // Para esta refactor, cada CombatEnemy debe exponer { position, rotation, _t, targeted, _cfg, _type }.
  update(enemies, _delta) {
    // Reset counters
    for (const t of TYPES) this._enemiesByType[t].length = 0;

    // Bucket por type
    for (const e of enemies) {
      if (!e?.active) continue;
      const arr = this._enemiesByType[e._type];
      if (!arr || arr.length >= MAX_INSTANCES_PER_TYPE) continue;
      arr.push(e);
    }

    for (const t of TYPES) {
      const list = this._enemiesByType[t];
      const cfg  = CFGS[t];
      const n    = list.length;
      const hull = this._hullMesh[t];
      const core = this._coreMesh[t];
      const rings= this._ringMesh[t];

      for (let i = 0; i < n; i++) {
        const e = list[i];

        // Hull matrix (group transform)
        this._dummy.position.copy(e.position);
        this._dummy.rotation.copy(e.rotation);
        const targetScale = e.targeted ? 1 + Math.sin(e._t * 18) * 0.03 : 1;
        this._dummy.scale.setScalar(targetScale);
        this._dummy.updateMatrix();
        hull.setMatrixAt(i, this._dummy.matrix);

        // Core: misma transform + scale del coreR + pulse
        const pulse = cfg.coreScale + Math.sin(e._t * cfg.pulseFreq) * 0.14;
        this._dummy.scale.setScalar(targetScale * cfg.coreR * pulse);
        this._dummy.updateMatrix();
        core.setMatrixAt(i, this._dummy.matrix);

        // Core color (targeted vs default)
        const c = e.targeted ? 0xffcc00 : cfg.color;
        this._color.setHex(c).toArray(core.instanceColor.array, i * 3);

        // Rings: cada ring tiene su propia rotación base + offset desde grp.userData.rotSpeed
        for (let r = 0; r < rings.length; r++) {
          const rim  = rings[r];
          const rd   = rim.userData.def;
          this._dummy.position.copy(e.position);
          this._dummy.rotation.copy(e.rotation);
          if (rd.rotX !== undefined) this._dummy.rotation.x += rd.rotX;
          if (rd.rotZ !== undefined) this._dummy.rotation.z += rd.rotZ;
          this._dummy.scale.setScalar(targetScale);
          this._dummy.updateMatrix();
          rim.setMatrixAt(i, this._dummy.matrix);
        }
      }

      hull.count = n; hull.instanceMatrix.needsUpdate = true;
      core.count = n; core.instanceMatrix.needsUpdate = true;
      if (core.instanceColor) core.instanceColor.needsUpdate = true;
      for (const rim of rings) { rim.count = n; rim.instanceMatrix.needsUpdate = true; }
    }
  }

  dispose() {
    for (const t of TYPES) {
      this._hullMesh[t]?.geometry.dispose();
      this._hullMesh[t]?.material.dispose();
      this._scene.remove(this._hullMesh[t]);
      this._coreMesh[t]?.geometry.dispose();
      this._coreMesh[t]?.material.dispose();
      this._scene.remove(this._coreMesh[t]);
      for (const rim of (this._ringMesh[t] ?? [])) {
        rim.geometry.dispose(); rim.material.dispose();
        this._scene.remove(rim);
      }
    }
  }
}
