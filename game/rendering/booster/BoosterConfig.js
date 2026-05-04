import * as THREE from 'three';

// 10-level opacity ramp: flowRatio 0→1 maps across these values.
// Level 1 (no flow): very ghostly. Level 10 (full flow): fully solid.
// Shared by all ships — override per-config if a ship needs a different feel.
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

export const SHIP_BOOSTER_CONFIGS = {

  // spaceshipnew.glb  |  targetLength 3.8
  // Combat: booster attached to _group (no rotation). Model yaw=π/2 maps nose(+X)→world -Z,
  // tail(-X)→world +Z. So booster sits at +Z in group space; flame points +Z by default (no rootRotY).
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
    normalRamp: [
      0xf0f8ff, // 1. Azul muy pálido
      0xd4e6ff, // 2. Azul pastel claro
      0xb8d9ff, // 3. Azul pastel
      0x86c8ff, // 4. Azul suave
      0x5eb8ff, // 5. Azul brillante
      0x4d7eff, // 6. Azul medio
      0x3d5fa8, // 7. Azul oscuro
      0x2d4180, // 8. Azul muy oscuro
      0x1a2555, // 9. Azul casi negro
    ],
    flowRamp:  0x0f1633,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // spaceship.glb  |  targetLength 5.0
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
    normalRamp: [
      0xf0f8ff, // 1. Azul muy pálido
      0xd4e6ff, // 2. Azul pastel claro
      0xb8d9ff, // 3. Azul pastel
      0x8adfff, // 4. Azul suave
      0x6b8cff, // 5. Azul brillante
      0x4d6ecc, // 6. Azul medio
      0x3d5aa8, // 7. Azul oscuro
      0x2d4180, // 8. Azul muy oscuro
      0x1a2555, // 9. Azul casi negro
    ],
    flowRamp:  0x0f1633,
    sizeRamp:  [1.0, 1.04, 1.08, 1.14, 1.55],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // spaceship__low_poly.glb  |  targetLength 3.2
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
    normalRamp: [
      0xffe6e0, // 1. Rojo muy pálido
      0xffcccc, // 2. Rojo pastel claro
      0xffb3b3, // 3. Rojo pastel
      0xffaa99, // 4. Rojo suave
      0xff7755, // 5. Rojo brillante
      0xff5533, // 6. Rojo medio
      0xdd4422, // 7. Rojo oscuro
      0xaa2211, // 8. Rojo muy oscuro
      0x660000, // 9. Rojo casi negro
    ],
    flowRamp:  0x330000,
    sizeRamp:  [1.0, 1.04, 1.08, 1.14, 1.55],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // ─── HANGAR configs ────────────────────────────────────────────────────────
  // Posiciones en espacio local del modelo SIN escalar. Ajustar visualmente.

  // spaceship.glb — 2 boosters amarillos, lado a lado en la trasera
  // localPosition: fracción de half-bbox. z=-1.0 → cara -Z (trasera real del modelo).
  // flipZ: invierte el root 180° para que la llama apunte hacia afuera (-Z).
  // hangarColor: color forzado vía setThermalColor() después de cada update().
  hangar_spaceship_0: {
    localPosition: new THREE.Vector3(-0.315, -0.3, -0.9),
    flipZ:         true,
    hangarColor:   0xffcc44,
    bodyRadius:    0.16,
    bodyLength:    0.80,
    ringRadius:    0.26,
    flameSize:     1.50,
    innerSize:     0.60,
    starSize:      2.40,
    lightColor:    0xffcc44,
    lightIntens:   5.5,
    lightDist:     10.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    bodyColor:     0xcc8800,
    flameColor:    0xffcc44,
    innerColor:    0xffeeaa,
    starColor:     0xff9900,
    ringColor:     0xffcc44,
    normalRamp: [
      0xfffbe6, // 1. Amarillo muy pálido
      0xffe499, // 2. Amarillo pastel
      0xffcc44, // 3. Amarillo brillante
      0xffbb22, // 4. Amarillo dorado
      0xffaa00, // 5. Amarillo anaranjado
      0xe68800, // 6. Naranja medio
      0xcc6600, // 7. Naranja tostado
      0x994400, // 8. Marrón anaranjado
      0x662200, // 9. Marrón oscuro
    ],
    flowRamp:  0x330f00,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.6],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },
  hangar_spaceship_1: {
    localPosition: new THREE.Vector3(0.315, -0.3, -0.9),
    flipZ:         true,
    hangarColor:   0xffcc44,
    bodyRadius:    0.16,
    bodyLength:    0.80,
    ringRadius:    0.26,
    flameSize:     1.50,
    innerSize:     0.60,
    starSize:      2.40,
    lightColor:    0xffcc44,
    lightIntens:   5.5,
    lightDist:     10.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.35),
    bodyColor:     0xcc8800,
    flameColor:    0xffcc44,
    innerColor:    0xffeeaa,
    starColor:     0xff9900,
    ringColor:     0xffcc44,
    normalRamp: [
      0xfffbe6, // 1. Amarillo muy pálido
      0xffe499, // 2. Amarillo pastel
      0xffcc44, // 3. Amarillo brillante
      0xffbb22, // 4. Amarillo dorado
      0xffaa00, // 5. Amarillo anaranjado
      0xe68800, // 6. Naranja medio
      0xcc6600, // 7. Naranja tostado
      0x994400, // 8. Marrón anaranjado
      0x662200, // 9. Marrón oscuro
    ],
    flowRamp:  0x330f00,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.6],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // spaceshipnew.glb — hangar (misma nave que combatPlayer, distinto sistema de coordenadas)
  // Hangar: wrapper.rotation.y = -π/2 → morro(+X) apunta world -Z, cola(-X) apunta world -Z opuesto.
  // localPosition es fracción de halfSize. x=-0.85 → cola en -X. rootRotY=-π/2 → llama apunta -X.
  // Calibrar x/y/z con los debug markers hasta que el fuego salga de la tobera.
  hangar_spaceshipnew_0: {
    localPosition: new THREE.Vector3(-0.94, -0.15, 0),
    rootRotY:      -1.5708,
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
    bodyColor:     0x5d84ff,
    flameColor:    0x7fdcff,
    innerColor:    0xbef2ff,
    starColor:     0x5d84ff,
    ringColor:     0x5d84ff,
    // 9-level ramp: claro azul → saturado azul → oscuro azul
    normalRamp: [
      0xf0f8ff, // 1. Azul muy pálido
      0xd4e6ff, // 2. Azul pastel claro
      0xb8d9ff, // 3. Azul pastel
      0x7fdcff, // 4. Azul suave
      0x5d84ff, // 5. Azul brillante
      0x4d7eff, // 6. Azul medio
      0x3d5fa8, // 7. Azul oscuro
      0x2d4180, // 8. Azul muy oscuro
      0x1a2555, // 9. Azul casi negro
    ],
    flowRamp:  0x0f1633,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // cb1 — 2 propulsores morados, simétricos a cada lado del motor central
  // bbox: x=58.44 y=11.81 z=50.62 | scale=0.038 | rotationY=-π/2
  // x_half=1.110  y_half=0.224  z_half=0.962
  hangar_cb1_0: {
    localPosition: new THREE.Vector3(-0.7, -0.1, -0.3935),
    rootRotY:      -1.5708, // Rota el propulsor 90 grados para que apunte hacia atrás
    hangarColor:   0xffc4ff,
    bodyRadius:    0.07,
    bodyLength:    0.40,
    ringRadius:    0.14,
    flameSize:     0.75,
    innerSize:     0.28,
    starSize:      1.10,
    lightColor:    0xffc4ff,
    lightIntens:   4.5,
    lightDist:     8.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    bodyColor:     0x993399,
    flameColor:    0xffc4ff,
    innerColor:    0xfff0ff,
    starColor:     0xee88ff,
    ringColor:     0xddaaff,
    normalRamp: [
      0xfff0ff, // 1. Morado muy pálido
      0xf5e0ff, // 2. Morado pastel claro
      0xf0ccff, // 3. Morado pastel
      0xee88ff, // 4. Morado suave
      0xe066ff, // 5. Morado brillante
      0xdd44ff, // 6. Morado medio
      0xbb22dd, // 7. Morado oscuro
      0x881199, // 8. Morado muy oscuro
      0x440055, // 9. Morado casi negro
    ],
    flowRamp:  0x220033,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },
  hangar_cb1_1: {
    localPosition: new THREE.Vector3(-0.7, -0.1, 0.3935),
    rootRotY:      -1.5708,
    hangarColor:   0xffc4ff,
    bodyRadius:    0.07,
    bodyLength:    0.40,
    ringRadius:    0.14,
    flameSize:     0.75,
    innerSize:     0.28,
    starSize:      1.10,
    lightColor:    0xffc4ff,
    lightIntens:   4.5,
    lightDist:     8.5,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    bodyColor:     0x993399,
    flameColor:    0xffc4ff,
    innerColor:    0xfff0ff,
    starColor:     0xee88ff,
    ringColor:     0xddaaff,
    normalRamp: [
      0xfff0ff, // 1. Morado muy pálido
      0xf5e0ff, // 2. Morado pastel claro
      0xf0ccff, // 3. Morado pastel
      0xee88ff, // 4. Morado suave
      0xe066ff, // 5. Morado brillante
      0xdd44ff, // 6. Morado medio
      0xbb22dd, // 7. Morado oscuro
      0x881199, // 8. Morado muy oscuro
      0x440055, // 9. Morado casi negro
    ],
    flowRamp:  0x220033,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // ig127.glb — 4 boosters rojos, formación cuadrada (2 arriba + 2 abajo)
  hangar_ig127_0: {
    localPosition: new THREE.Vector3(-0.29, 0.05, 0.91),
    hangarColor:   0xff4422,
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightColor:    0xff4422,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    bodyColor:     0xff5533,
    flameColor:    0xff3311,
    innerColor:    0xffd0c0,
    starColor:     0xff6644,
    ringColor:     0xff4422,
    normalRamp: [
      0xffe6e0, // 1. Rojo muy pálido
      0xffcccc, // 2. Rojo pastel claro
      0xffb3b3, // 3. Rojo pastel
      0xffaa99, // 4. Rojo suave
      0xff7755, // 5. Rojo brillante
      0xff5533, // 6. Rojo medio
      0xdd4422, // 7. Rojo oscuro
      0xaa2211, // 8. Rojo muy oscuro
      0x660000, // 9. Rojo casi negro
    ],
    flowRamp:  0x330000,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },
  hangar_ig127_1: {
    localPosition: new THREE.Vector3(0.29, 0.05, 0.91),
    hangarColor:   0xff4422,
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightColor:    0xff4422,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    bodyColor:     0xff5533,
    flameColor:    0xff3311,
    innerColor:    0xffd0c0,
    starColor:     0xff6644,
    ringColor:     0xff4422,
    normalRamp: [
      0xffe6e0, // 1. Rojo muy pálido
      0xffcccc, // 2. Rojo pastel claro
      0xffb3b3, // 3. Rojo pastel
      0xffaa99, // 4. Rojo suave
      0xff7755, // 5. Rojo brillante
      0xff5533, // 6. Rojo medio
      0xdd4422, // 7. Rojo oscuro
      0xaa2211, // 8. Rojo muy oscuro
      0x660000, // 9. Rojo casi negro
    ],
    flowRamp:  0x330000,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },
  hangar_ig127_2: {
    localPosition: new THREE.Vector3(-0.29, -0.7, 0.91),
    hangarColor:   0xff4422,
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightColor:    0xff4422,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    bodyColor:     0xff5533,
    flameColor:    0xff3311,
    innerColor:    0xffd0c0,
    starColor:     0xff6644,
    ringColor:     0xff4422,
    normalRamp: [
      0xffe6e0, // 1. Rojo muy pálido
      0xffcccc, // 2. Rojo pastel claro
      0xffb3b3, // 3. Rojo pastel
      0xffaa99, // 4. Rojo suave
      0xff7755, // 5. Rojo brillante
      0xff5533, // 6. Rojo medio
      0xdd4422, // 7. Rojo oscuro
      0xaa2211, // 8. Rojo muy oscuro
      0x660000, // 9. Rojo casi negro
    ],
    flowRamp:  0x330000,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },
  hangar_ig127_3: {
    localPosition: new THREE.Vector3(0.29, -0.7, 0.91),
    hangarColor:   0xff4422,
    bodyRadius:    0.10,
    bodyLength:    0.55,
    ringRadius:    0.18,
    flameSize:     1.00,
    innerSize:     0.40,
    starSize:      1.60,
    lightColor:    0xff4422,
    lightIntens:   4.5,
    lightDist:     8.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.25),
    bodyColor:     0xff5533,
    flameColor:    0xff3311,
    innerColor:    0xffd0c0,
    starColor:     0xff6644,
    ringColor:     0xff4422,
    normalRamp: [
      0xffe6e0, // 1. Rojo muy pálido
      0xffcccc, // 2. Rojo pastel claro
      0xffb3b3, // 3. Rojo pastel
      0xffaa99, // 4. Rojo suave
      0xff7755, // 5. Rojo brillante
      0xff5533, // 6. Rojo medio
      0xdd4422, // 7. Rojo oscuro
      0xaa2211, // 8. Rojo muy oscuro
      0x660000, // 9. Rojo casi negro
    ],
    flowRamp:  0x330000,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // lowpoly.glb — 1 booster violeta oscuro, discreto (nave espía)
  hangar_lowpoly_0: {
    localPosition: new THREE.Vector3(0, -0, 0.8),
    bodyRadius:    0.11,
    bodyLength:    0.54,
    ringRadius:    0.19,
    flameSize:     0.84,
    innerSize:     0.34,
    starSize:      1.32,
    lightColor:    0xfff6cc,
    lightIntens:   3.6,
    lightDist:     7.2,
    lightOffset:   new THREE.Vector3(0, 0, 0.20),
    bodyColor:     0xd4c888,
    flameColor:    0xfff6cc,
    innerColor:    0xfffdf0,
    starColor:     0xffe8aa,
    ringColor:     0xfff6cc,
    normalRamp: [
      0xfffdf0, // 1. Beige muy pálido
      0xfffbde, // 2. Beige pastel claro
      0xfffbcc, // 3. Beige pastel
      0xfff6cc, // 4. Beige suave
      0xffe8aa, // 5. Beige brillante
      0xf0daa8, // 6. Beige medio
      0xd4c888, // 7. Beige oscuro
      0xa89860, // 8. Beige muy oscuro
      0x7a6c40, // 9. Beige casi negro
    ],
    flowRamp:  0x3d3620,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },

  // colaid1.glb — usa animaciones integradas del .glb (igual que cb1)

  // waldeinsamkeit.glb — 1 booster naranja intenso, GRANDE (motor único destructivo)
  hangar_waldeinsamkeit_0: {
    localPosition: new THREE.Vector3(0, -0.1, 0.9),
    bodyRadius:    0.25,
    bodyLength:    1.50,
    ringRadius:    0.45,
    flameSize:     2.80,
    innerSize:     1.10,
    starSize:      4.00,
    lightColor:    0xff6622,
    lightIntens:   12.0,
    lightDist:     22.0,
    lightOffset:   new THREE.Vector3(0, 0, 0.55),
    bodyColor:     0xcc4400,
    flameColor:    0xff6622,
    innerColor:    0xffddaa,
    starColor:     0xff3300,
    ringColor:     0xff6622,
    normalRamp: [
      0xffe6cc, // 1. Naranja muy pálido
      0xffd9b3, // 2. Naranja pastel claro
      0xffcc99, // 3. Naranja pastel
      0xffbb77, // 4. Naranja suave
      0xffaa55, // 5. Naranja brillante
      0xff8844, // 6. Naranja medio
      0xff6622, // 7. Naranja oscuro
      0xdd4411, // 8. Naranja muy oscuro
      0xaa2200, // 9. Naranja casi negro
    ],
    flowRamp:  0x551100,
    sizeRamp:  [0.6, 0.7, 0.8, 0.9, 0.8],
    opacityRamp: DEFAULT_OPACITY_RAMP,
  },
};
