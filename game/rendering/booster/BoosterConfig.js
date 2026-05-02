import * as THREE from 'three';

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
  combatPlayer: {
    localPosition: new THREE.Vector3(0, -0.18, 2.10),
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
  },
};
