import * as THREE from 'three';
import { SHIP_PALETTES } from '../../../shared/constants.js';

// 10-level opacity ramp: flowRatio 0→1 maps across these values.
// Level 1 (no flow): very ghostly. Level 10 (full flow): fully solid.
export const DEFAULT_OPACITY_RAMP = [0.15, 0.28, 0.44, 0.58, 0.72, 0.84, 0.93, 1.0, 1.0, 1.0];

export const BOOST_PALETTE = {
  dark:  new THREE.Color(0x102a7a),
  mid:   new THREE.Color(0x4d7eff),
  light: new THREE.Color(0xb8f2ff),
};

export const FLOW_PALETTE = {
  dark:  new THREE.Color(0xb400ff),
  mid:   new THREE.Color(0xdb00ff),
  light: new THREE.Color(0xea00ff),
};

// ─── Helper ────────────────────────────────────────────────────────────────
// Short-hand: spread palette colors + opacityRamp into a config fragment.
// Each hangar_* config only needs to declare spatial/dimensional properties.
const pal = (shipId) => ({
  ...SHIP_PALETTES[shipId],
  opacityRamp: DEFAULT_OPACITY_RAMP,
});

export const SHIP_BOOSTER_CONFIGS = {

  // ── Role-based configs (legacy) ──────────────────────────────────────────
  // These are NOT used by player ships (which resolve hangar_<id>_N at runtime).
  // Kept for backwards-compatibility; colors are intentionally inline here.

  // spaceshipnew.glb — combat role preset (blue/cyan)
  combatPlayer: {
    localPosition: new THREE.Vector3(0, -0.15, 1.65),
    bodyRadius:    0.14,
    bodyLength:    1.20,
    ringRadius:    0.26,
    flameSize:     0.95,
    innerSize:     0.42,
    starSize:      1.10,
    lightColor:    0x86e8ff,
    lightIntens:   9.0,
    lightDist:     16.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    bodyColor:     0x2340b8,
    flameColor:    0x7fdcff,
    innerColor:    0xbef2ff,
    starColor:     0x16368f,
    ringColor:     0x5d84ff,
    normalRamp: SHIP_PALETTES.spaceshipnew.normalRamp,
    flowRamp:   SHIP_PALETTES.spaceshipnew.flowRamp,
    sizeRamp:    [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // spaceship.glb — racing role preset (blue/cyan — intentionally different from hangar yellow)
  racingPlayer: {
    localPosition: new THREE.Vector3(0, -0.34, 2.25),
    bodyRadius:    0.22,
    bodyLength:    0.88,
    ringRadius:    0.32,
    flameSize:     1.85,
    innerSize:     0.75,
    starSize:      2.90,
    lightColor:    0x86e8ff,
    lightIntens:   6.5,
    lightDist:     12.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.45),
    bodyColor:     0x1f3d9f,
    flameColor:    0x8adfff,
    innerColor:    0xc7f7ff,
    starColor:     0x17368f,
    ringColor:     0x6b8cff,
    normalRamp: SHIP_PALETTES.spaceshipnew.normalRamp,
    flowRamp:   SHIP_PALETTES.spaceshipnew.flowRamp,
    sizeRamp:    [1.0, 1.04, 1.08, 1.14, 1.55],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // spaceship__low_poly.glb — racing opponent (red, to visually contrast with player)
  racingOpponent: {
    localPosition: new THREE.Vector3(0, -0.16, 1.38),
    bodyRadius:    0.16,
    bodyLength:    0.65,
    ringRadius:    0.24,
    flameSize:     1.50,
    innerSize:     0.60,
    starSize:      2.35,
    lightColor:    0xff4422,
    lightIntens:   5.8,
    lightDist:     10.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.30),
    bodyColor:     0xff5533,
    flameColor:    0xff3311,
    innerColor:    0xffd0c0,
    starColor:     0xff6644,
    ringColor:     0xff4422,
    normalRamp: SHIP_PALETTES.ig127.normalRamp,
    flowRamp:   SHIP_PALETTES.ig127.flowRamp,
    sizeRamp:    [1.0, 1.04, 1.08, 1.14, 1.55],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // ── Hangar configs — colors from SHIP_PALETTES ───────────────────────────
  // Only spatial/dimensional properties are declared here.
  // All color fields (lightColor, bodyColor, flameColor, innerColor, starColor,
  // ringColor, hangarColor, normalRamp, flowRamp) are spread from SHIP_PALETTES.

  // spaceship.glb — 2 boosters, lado a lado en la trasera
  // localPosition: fracción de half-bbox. z=-1.0 → cara -Z (trasera real del modelo).
  // flipZ: invierte el root 180° para que la llama apunte hacia afuera (-Z).
  hangar_spaceship_0: {
    ...pal('spaceship'),
    localPosition: new THREE.Vector3(-0.315, -0.3, -0.9),
    flipZ:         true,
    bodyRadius:    0.16,
    bodyLength:    0.80,
    ringRadius:    0.26,
    flameSize:     1.50,
    innerSize:     0.60,
    starSize:      2.40,
    lightIntens:   5.5,
    lightDist:     10.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.6],
  },
  hangar_spaceship_1: {
    ...pal('spaceship'),
    localPosition: new THREE.Vector3(0.315, -0.3, -0.9),
    flipZ:         true,
    bodyRadius:    0.16,
    bodyLength:    0.80,
    ringRadius:    0.26,
    flameSize:     1.50,
    innerSize:     0.60,
    starSize:      2.40,
    lightIntens:   5.5,
    lightDist:     10.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.6],
  },

  // spaceshipnew.glb — hangar (misma nave que combatPlayer, distinto sistema de coordenadas)
  // x=-0.85 → cola en -X. rootRotY=-π/2 → llama apunta -X.
  hangar_spaceshipnew_0: {
    ...pal('spaceshipnew'),
    localPosition: new THREE.Vector3(-0.94, -0.15, 0),
    rootRotY:      -1.5708,
    bodyRadius:    0.14,
    bodyLength:    1.20,
    ringRadius:    0.26,
    flameSize:     0.95,
    innerSize:     0.42,
    starSize:      1.10,
    lightIntens:   9.0,
    lightDist:     16.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },

  // cb1 — 2 propulsores, simétricos a cada lado del motor central
  // bbox: x=58.44 y=11.81 z=50.62 | scale=0.038 | rotationY=-π/2
  hangar_cb1_0: {
    ...pal('cb1'),
    localPosition: new THREE.Vector3(-0.7, -0.1, -0.3935),
    rootRotY:      -1.5708,
    bodyRadius:    0.07,
    bodyLength:    0.40,
    ringRadius:    0.14,
    flameSize:     0.75,
    innerSize:     0.28,
    starSize:      1.10,
    lightIntens:   4.5,
    lightDist:     8.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },
  hangar_cb1_1: {
    ...pal('cb1'),
    localPosition: new THREE.Vector3(-0.7, -0.1, 0.3935),
    rootRotY:      -1.5708,
    bodyRadius:    0.07,
    bodyLength:    0.40,
    ringRadius:    0.14,
    flameSize:     0.75,
    innerSize:     0.28,
    starSize:      1.10,
    lightIntens:   4.5,
    lightDist:     8.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },

  // ig127.glb — 4 boosters, formación cuadrada (2 arriba + 2 abajo)
  hangar_ig127_0: {
    ...pal('ig127'),
    localPosition: new THREE.Vector3(-0.29, 0.05, 0.91),
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },
  hangar_ig127_1: {
    ...pal('ig127'),
    localPosition: new THREE.Vector3(0.29, 0.05, 0.91),
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },
  hangar_ig127_2: {
    ...pal('ig127'),
    localPosition: new THREE.Vector3(-0.29, -0.7, 0.91),
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },
  hangar_ig127_3: {
    ...pal('ig127'),
    localPosition: new THREE.Vector3(0.29, -0.7, 0.91),
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },

  // lowpoly.glb — 1 booster, beige/dorado discreto
  hangar_lowpoly_0: {
    ...pal('lowpoly'),
    localPosition: new THREE.Vector3(0, 0, 0.8),
    bodyRadius:    0.11,
    bodyLength:    0.54,
    ringRadius:    0.19,
    flameSize:     0.84,
    innerSize:     0.34,
    starSize:      1.32,
    lightIntens:   3.6,
    lightDist:     7.2,
    lightOffset:   new THREE.Vector3(0, 0, 0.20),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },

  // waldeinsamkeit.glb — 1 booster naranja intenso, GRANDE (motor único)
  hangar_waldeinsamkeit_0: {
    ...pal('waldeinsamkeit'),
    localPosition: new THREE.Vector3(0, -0.1, 0.9),
    bodyRadius:    0.25,
    bodyLength:    1.50,
    ringRadius:    0.45,
    flameSize:     2.80,
    innerSize:     1.10,
    starSize:      4.00,
    lightIntens:   12.0,
    lightDist:     22.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.55),
    sizeRamp:      [0.6, 0.7, 0.8, 0.9, 0.8],
  },
};
