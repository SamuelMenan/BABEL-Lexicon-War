import * as THREE from 'three';

const { clamp } = THREE.MathUtils;

const _tmp            = new THREE.Color();
const _paletteCache   = new WeakMap();

/** Multi-frequency flicker noise — [0,1]. */
export function computeFlicker(t) {
  return (Math.sin(t * 13.1) * 0.5 + 0.5) * 0.20
       + (Math.sin(t *  5.7) * 0.5 + 0.5) * 0.48
       + (Math.sin(t *  1.9) * 0.5 + 0.5) * 0.32;
}

/** Parse and cache per-config 5-color ramps as THREE.Color arrays. */
function getPalette(cfg) {
  if (!cfg?.normalRamp) return null;
  if (_paletteCache.has(cfg)) return _paletteCache.get(cfg);
  
  // flowRamp: puede ser un array de 5 colores O un color único (hex)
  // Si es un color único, replicarlo en los 5 slots
  const flowRampArray = typeof cfg.flowRamp === 'number'
    ? [cfg.flowRamp, cfg.flowRamp, cfg.flowRamp, cfg.flowRamp, cfg.flowRamp]
    : cfg.flowRamp;
  
  const pal = {
    normal: cfg.normalRamp.map(c => new THREE.Color(c)),
    flow:   flowRampArray.map(c => new THREE.Color(c)),
  };
  _paletteCache.set(cfg, pal);
  return pal;
}

/** Sample a color ramp of any length at t∈[0,1] into `out`. Returns `out`. */
function sampleRamp(ramp, t, out) {
  const c    = clamp(t, 0, 1);
  const n    = ramp.length - 1;
  const seg  = Math.min(n - 1, Math.floor(c * n));
  const frac = clamp(c * n - seg, 0, 1);
  return out.lerpColors(ramp[seg], ramp[seg + 1], frac);
}

/**
 * Compute per-frame colors into `out` (preallocated THREE.Color map).
 * Mutates out.body / out.flame / out.inner / out.ring / out.star in place.
 *
 * @param {number} flowRatio  0.0 = full normal palette, 1.0 = full flow palette.
 *                            Pass `flowActive ? 1.0 : flow/100` from the ship update.
 * @param {object} cfg        Config object (optional). If it has normalRamp/flowRamp,
 *                            those 5-color per-ship ramps are used instead of the
 *                            global boost/flow palette.
 */
export function computeColors(s, flicker, lb, flowRatio, boost, flow, out, cfg) {
  const fr  = clamp(flowRatio ?? 0, 0, 1);
  const pal = getPalette(cfg);

  if (pal) {
    // Single ramp (normalRamp): pálido[0] → saturado[N-1].
    // t_slot = base(slot) + fr * range(slot) + jitter(s,flicker,lb).
    // fr=0 → muestreo cerca del extremo claro; fr=1 → extremo profundo.
    const ramp = pal.normal;
    const sampleSlot = (base, range, jitter, slot) => {
      const t = clamp(base + fr * range + jitter, 0, 1);
      sampleRamp(ramp, t, out[slot]);
    };
    const j = flicker * 0.04 + lb * 0.06 + s * 0.08;
    sampleSlot(0.25, 0.65, j,                'body');   // body: medio→profundo
    sampleSlot(0.10, 0.55, j * 0.6,          'flame');  // flame: claro→saturado
    sampleSlot(0.00, 0.35, j * 0.4,          'inner');  // inner: siempre claro
    sampleSlot(0.20, 0.60, j * 0.7,          'ring');
    sampleSlot(0.05, 0.45, j * 0.5,          'star');
  } else {
    // Global 3-color palettes with smooth flowRatio blend
    const blendG = (bA, bB, tB, fA, fB, tF, slot) => {
      out[slot].lerpColors(bA, bB, clamp(tB, 0, 1));
      if (fr > 0) { _tmp.lerpColors(fA, fB, clamp(tF, 0, 1)); out[slot].lerp(_tmp, fr); }
    };
    blendG(boost.dark, boost.mid,   0.20 + s*0.45 + flicker*0.12 + lb*0.18,
           flow.dark,  flow.mid,    0.55 + s*0.30 + flicker*0.10 + lb*0.25, 'body');
    blendG(boost.mid,  boost.light, 0.35 + s*0.50 + lb*0.22,
           flow.mid,   flow.light,  0.45 + s*0.35 + lb*0.20,                'flame');
    blendG(boost.dark, boost.light, 0.45 + s*0.30 + flicker*0.10,
           flow.dark,  flow.light,  0.35 + s*0.35 + flicker*0.10,           'inner');
    blendG(boost.dark, boost.mid,   0.30 + s*0.42,
           flow.dark,  flow.mid,    0.48 + s*0.38,                          'ring');
    blendG(boost.mid,  boost.light, 0.50 + s*0.30 + lb*0.10,
           flow.mid,   flow.light,  0.50 + s*0.28 + lb*0.12,                'star');
  }
}

/** Create mutable lateral-motion tracking state for one BoosterEffect instance. */
export function createLateralState() {
  return { prevPos: new THREE.Vector3(), hasPos: false, prevYaw: 0, dynamic: 0 };
}

/**
 * Compute lateral offset [-1,1] from ship roll / side-velocity / yaw-rate.
 * Mutates `state` in place. Returns clamped lateral value.
 */
export function updateLateral(state, shipGroup, delta) {
  if (!shipGroup) return 0;

  const roll    = clamp(-shipGroup.rotation.z * 5.2, -1, 1);
  const shipPos = shipGroup.position;
  if (!state.hasPos) { state.prevPos.copy(shipPos); state.hasPos = true; }
  const sideVel = clamp((shipPos.x - state.prevPos.x) / Math.max(delta, 1e-4) * 0.45, -1, 1);
  state.prevPos.copy(shipPos);
  const yawRaw  = shipGroup.rotation.y - state.prevYaw;
  const yawLat  = clamp(-Math.atan2(Math.sin(yawRaw), Math.cos(yawRaw)) / Math.max(delta, 1e-4) * 0.09, -1, 1);
  state.prevYaw = shipGroup.rotation.y;

  const raw = roll * 0.45 + sideVel * 0.35 + yawLat * 0.20;
  state.dynamic += (raw - state.dynamic) * Math.min(delta * 10.0, 1);
  return clamp(state.dynamic, -1, 1);
}
