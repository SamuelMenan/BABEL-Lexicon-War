import * as THREE from 'three';
import { SHIP_PALETTES } from '../../../shared/constants.js';

// Campos por cañón:
//   localPosition: fracción de half-bbox (igual convención que SHIP_BOOSTER_CONFIGS).
//   forwardLocal:  dirección del disparo en espacio local del wrapper (antes de scale).
//   color/emissive: tomados de SHIP_PALETTES.
//   scale (opcional, default 1.0): multiplicador uniforme del bolt, láser y
//                                   anillo de boquilla de ESTE cañón. Ej. 0.6
//                                   = 60% del tamaño base. Aplicable a cualquier
//                                   nave; se pueden mezclar escalas distintas
//                                   por cañón si se quiere asimetría.
//
// Naves pendientes (colaid1):
// añadir entradas hangar_<id>_<N> cuando se confirmen posiciones.
export const SHIP_MUZZLE_CONFIGS = {
  // spaceship — 2 cañones, x/y de boosters, z=0 (z del marker -Y "bola verde oscura")
  hangar_spaceship_0: {
    localPosition: new THREE.Vector3(-0.315, -0.37, 0.03),
    forwardLocal:  new THREE.Vector3(0, 0, 1),
    color:         SHIP_PALETTES.spaceship.hangarColor,
    emissive:      SHIP_PALETTES.spaceship.flameColor,
    scale:         0.9,
  },
  hangar_spaceship_1: {
    localPosition: new THREE.Vector3(0.315, -0.37, 0.03),
    forwardLocal:  new THREE.Vector3(0, 0, 1),
    color:         SHIP_PALETTES.spaceship.hangarColor,
    emissive:      SHIP_PALETTES.spaceship.flameColor,
    scale:         0.9,
  },

  // spaceshipnew — 2 cañones en la punta (+X = morro tras rootRotY=-π/2 del booster).
  // z = marker rojo (+X) z = 0. Pequeña separación vertical (Y), no muy abiertos.
  hangar_spaceshipnew_0: {
    localPosition: new THREE.Vector3(0.9, -0.2, 0.35),
    forwardLocal:  new THREE.Vector3(1, 0, 0),
    color:         SHIP_PALETTES.spaceshipnew.hangarColor,
    emissive:      SHIP_PALETTES.spaceshipnew.flameColor,
  },
  hangar_spaceshipnew_1: {
    localPosition: new THREE.Vector3(0.9, -0.2, -0.35),
    forwardLocal:  new THREE.Vector3(1, 0, 0),
    color:         SHIP_PALETTES.spaceshipnew.hangarColor,
    emissive:      SHIP_PALETTES.spaceshipnew.flameColor,
  },

  // cb1 — 2 cañones en marker rojo (+X tip), separación horizontal en Z.
  // scale=0.6 → bolts/laser/anillos más pequeños que el resto de naves.
  hangar_cb1_0: {
    localPosition: new THREE.Vector3(0.9, -0.28, 0.08),
    forwardLocal:  new THREE.Vector3(1, 0, 0),
    color:         SHIP_PALETTES.cb1.hangarColor,
    emissive:      SHIP_PALETTES.cb1.flameColor,
    scale:         0.6,
  },
  hangar_cb1_1: {
    localPosition: new THREE.Vector3(0.9, -0.28, -0.08),
    forwardLocal:  new THREE.Vector3(1, 0, 0),
    color:         SHIP_PALETTES.cb1.hangarColor,
    emissive:      SHIP_PALETTES.cb1.flameColor,
    scale:         0.6,
  },

  // ig127 — 2 cañones. z = marker -Y (verde oscuro) z = 0. x,y copiados de boosters superiores (ig127_0/1).
  // noseAxis='-z' → forwardLocal -Z (modelo). rotationY=-π en wrapper ajusta dirección a mundo.
  hangar_ig127_0: {
    localPosition: new THREE.Vector3(-0.29, 0.03, 0.2),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.ig127.hangarColor,
    emissive:      SHIP_PALETTES.ig127.flameColor,
    scale:         0.6,
  },
  hangar_ig127_1: {
    localPosition: new THREE.Vector3(0.29, 0.03, 0.2),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.ig127.hangarColor,
    emissive:      SHIP_PALETTES.ig127.flameColor,
    scale:         0.6,
  },
  hangar_ig127_2: {
    localPosition: new THREE.Vector3(-0.29, -0.7, 0.2),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.ig127.hangarColor,
    emissive:      SHIP_PALETTES.ig127.flameColor,
    scale:         0.6,
  },
  hangar_ig127_3: {
    localPosition: new THREE.Vector3(0.29, -0.7, 0.2),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.ig127.hangarColor,
    emissive:      SHIP_PALETTES.ig127.flameColor,
    scale:         0.6,
  },

  // lowpoly (Acechador Nocturno) — 1 cañón en marker -Z (azul oscuro = nariz), poco más abajo.
  hangar_lowpoly_0: {
    localPosition: new THREE.Vector3(0, -0.4, -1),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.lowpoly.hangarColor,
    emissive:      SHIP_PALETTES.lowpoly.flameColor,
    scale:         0.6,
  },

  // waldeinsamkeit — 4 cañones, 2 arriba / 2 abajo. Nariz = marker -Z (azul oscuro).
  // Pares escalonados en Z para que no queden alineados uno detrás del otro.
  hangar_waldeinsamkeit_0: {
    localPosition: new THREE.Vector3(-0.7,  0.3, -0.9),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.waldeinsamkeit.hangarColor,
    emissive:      SHIP_PALETTES.waldeinsamkeit.flameColor,
    scale:         0.8,
  },
  hangar_waldeinsamkeit_1: {
    localPosition: new THREE.Vector3( 0.7,  0.3, -0.9),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.waldeinsamkeit.hangarColor,
    emissive:      SHIP_PALETTES.waldeinsamkeit.flameColor,
    scale:         0.8,
  },
  hangar_waldeinsamkeit_2: {
    localPosition: new THREE.Vector3(-0.7, -0.53, -0.9),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.waldeinsamkeit.hangarColor,
    emissive:      SHIP_PALETTES.waldeinsamkeit.flameColor,
    scale:         0.8,
  },
  hangar_waldeinsamkeit_3: {
    localPosition: new THREE.Vector3( 0.7, -0.53, -0.9),
    forwardLocal:  new THREE.Vector3(0, 0, -1),
    color:         SHIP_PALETTES.waldeinsamkeit.hangarColor,
    emissive:      SHIP_PALETTES.waldeinsamkeit.flameColor,
    scale:         0.8,
  },
};

export const PROJECTILE_DEFAULTS = {
  speed:    28,    // fast — Star Wars bolt feel
  ttl:      1.6,   // seconds
  maxDist:  60,    // scene units
  radius:   0.08,  // legacy — unused after laser rewrite
};
