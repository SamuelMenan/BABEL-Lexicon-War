import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bridge } from '../../shared/bridge.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { LOADING_STAGES, ASSET_MANIFESTS, GAME_MODES } from '../../shared/constants.js';

// ── Caches ────────────────────────────────────────────────────────────────────

const _gltfCache = new Map();  // url → gltf
const _geoCache  = new Map();  // key → THREE.BufferGeometry
const _texCache  = new Map();  // key → THREE.Texture
const _matCache  = new Map();  // key → THREE.Material

// ── Helpers ───────────────────────────────────────────────────────────────────

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function _jitter(base, spread = 80) {
  return base + (Math.random() - 0.5) * 2 * spread;
}

function _loadGLTFAsync(url) {
  if (_gltfCache.has(url)) return Promise.resolve(_gltfCache.get(url));
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, gltf => { _gltfCache.set(url, gltf); resolve(gltf); }, undefined, reject);
  });
}

async function _stage(key, pStart, pEnd, minMs, task) {
  Bridge.setState({ loadingMessage: LOADING_STAGES[key] ?? key, loadingProgress: pStart });
  EventBus.emit(EventTypes.LOADING_PROGRESS, { progress: pStart, message: LOADING_STAGES[key], stage: key });
  const t0 = performance.now();
  await task();
  const hold = minMs - (performance.now() - t0);
  if (hold > 0) await _sleep(hold);
  Bridge.setState({ loadingProgress: pEnd });
}

function _buildGeometryCache() {
  const defs = [
    ['scout',    () => new THREE.IcosahedronGeometry(0.55, 1)],
    ['sentinel', () => new THREE.OctahedronGeometry(0.72, 0)],
    ['guardian', () => new THREE.DodecahedronGeometry(0.9, 0)],
    ['phantom',  () => new THREE.TetrahedronGeometry(0.8, 0)],
    ['apex',     () => new THREE.IcosahedronGeometry(1.1, 1)],
  ];
  for (const [key, factory] of defs) {
    if (_geoCache.has(key)) continue;
    const base = factory();
    _geoCache.set(key, new THREE.EdgesGeometry(base));
    base.dispose();
  }
  if (!_geoCache.has('sphere-8'))   _geoCache.set('sphere-8', new THREE.SphereGeometry(1, 8, 8));
  if (!_geoCache.has('sphere-12'))  _geoCache.set('sphere-12', new THREE.SphereGeometry(1, 12, 12));
  if (!_geoCache.has('torus-6-24')) _geoCache.set('torus-6-24', new THREE.TorusGeometry(1, 0.04, 6, 24));
}

// Upload all textures from every cached GLTF to GPU so first frame has no stall
function _warmupGPU(renderer) {
  if (!renderer) return;
  _gltfCache.forEach(gltf => {
    gltf.scene?.traverse(node => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(mat => {
        if (!mat) return;
        const maps = [
          mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap,
          mat.emissiveMap, mat.aoMap, mat.lightMap, mat.alphaMap,
        ];
        maps.forEach(tex => { if (tex) renderer.initTexture(tex); });
      });
    });
  });
}

async function _loadManifest(keys) {
  for (const key of keys) {
    const list = ASSET_MANIFESTS[key] ?? [];
    for (const entry of list) {
      if (entry.type === 'gltf') {
        try { await _loadGLTFAsync(entry.url); }
        catch { if (!entry.optional) throw new Error(`Required asset missing: ${entry.url}`); }
      }
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const AssetLoader = {
  /**
   * Preload assets for a mode (or null = shared only).
   * Idempotent: cached assets skip re-fetch, making re-entry fast.
   * Pass renderer to pre-upload textures to GPU — eliminates first-frame stutter.
   */
  async preload(mode, renderer = null) {
    Bridge.setState({ isLoading: true, loadingMode: mode ?? null, loadingProgress: 0, loadingMessage: '' });

    await _stage('INIT', 0, 15, _jitter(320, 60), () => _sleep(0));

    await _stage('GEOMETRY', 15, 35, _jitter(380, 90), () => {
      _buildGeometryCache();
    });

    // Load all GLTFs for shared + this mode
    await _stage('SCENE', 35, 68, _jitter(520, 110), async () => {
      const keys = ['shared'];
      if (mode) keys.push(mode);
      await _loadManifest(keys);
    });

    // Upload every cached texture to GPU — no stall on first render frame
    await _stage('WARMUP', 68, 90, _jitter(460, 100), () => {
      _warmupGPU(renderer);
    });

    await _stage('READY', 90, 100, _jitter(260, 60), () => _sleep(0));

    Bridge.setState({ isLoading: false, loadingProgress: 100 });
    EventBus.emit(EventTypes.LOADING_COMPLETE, { mode });
  },

  // ── Cache read/write ──────────────────────────────────────────────────────

  getEnemyEdges(typeKey) { return _geoCache.get(typeKey); },
  getGeo(key)            { return _geoCache.get(key); },
  getGLTF(url)           { return _gltfCache.get(url); },
  setGLTF(url, gltf)     { _gltfCache.set(url, gltf); },
  getTex(key)            { return _texCache.get(key); },
  setTex(key, tex)       { _texCache.set(key, tex); },
  hasGLTF(url)           { return _gltfCache.has(url); },

  getMat(key)            { return _matCache.get(key); },
  setMat(key, mat)       { _matCache.set(key, mat); },
  setGeo(key, geo)       { _geoCache.set(key, geo); },
};
