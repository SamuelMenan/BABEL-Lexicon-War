import * as THREE from 'three';

const { clamp } = THREE.MathUtils;

/** Multi-frequency flicker noise — [0,1]. */
export function computeFlicker(t) {
  return (Math.sin(t * 13.1) * 0.5 + 0.5) * 0.20
       + (Math.sin(t *  5.7) * 0.5 + 0.5) * 0.48
       + (Math.sin(t *  1.9) * 0.5 + 0.5) * 0.32;
}

/**
 * Compute per-frame colors into `out` (preallocated THREE.Color map).
 * Mutates out.body / out.flame / out.inner / out.ring / out.star in place.
 */
export function computeColors(s, flicker, lb, flowActive, boost, flow, out) {
  if (flowActive) {
    out.body.lerpColors(flow.dark,  flow.mid,   clamp(0.55 + s * 0.30 + flicker * 0.10 + lb * 0.25, 0, 1));
    out.flame.lerpColors(flow.mid,  flow.light, clamp(0.45 + s * 0.35 + lb * 0.20, 0, 1));
    out.inner.lerpColors(flow.dark, flow.light, clamp(0.35 + s * 0.35 + flicker * 0.10, 0, 1));
    out.ring.lerpColors(flow.dark,  flow.mid,   clamp(0.48 + s * 0.38, 0, 1));
    out.star.lerpColors(flow.mid,   flow.light, clamp(0.50 + s * 0.28 + lb * 0.12, 0, 1));
  } else {
    out.body.lerpColors(boost.dark,  boost.mid,   clamp(0.20 + s * 0.45 + flicker * 0.12 + lb * 0.18, 0, 1));
    out.flame.lerpColors(boost.mid,  boost.light, clamp(0.35 + s * 0.50 + lb * 0.22, 0, 1));
    out.inner.lerpColors(boost.dark, boost.light, clamp(0.45 + s * 0.30 + flicker * 0.10, 0, 1));
    out.ring.lerpColors(boost.dark,  boost.mid,   clamp(0.30 + s * 0.42, 0, 1));
    out.star.lerpColors(boost.mid,   boost.light, clamp(0.50 + s * 0.30 + lb * 0.10, 0, 1));
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
