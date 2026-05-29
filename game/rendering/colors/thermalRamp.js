import * as THREE from 'three';
import { COLORS_FLOW } from '@shared/config/constants.js';

let _rampColors = null;
const _cache = new THREE.Color();

export function getThermalColor(flow, flowActive) {
  if (!_rampColors) _rampColors = COLORS_FLOW.RAMP.map(c => new THREE.Color(c));
  if (flowActive) return COLORS_FLOW.RAMP[4];
  const norm = Math.max(0, Math.min(1, flow / 100));
  const seg  = Math.min(3, Math.floor(norm * 4));
  const t    = norm * 4 - seg;
  return '#' + _cache.copy(_rampColors[seg]).lerp(_rampColors[seg + 1], t).getHexString();
}
