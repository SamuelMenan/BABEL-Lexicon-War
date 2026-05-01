import * as THREE from 'three';
import { COLORS } from '../../../shared/constants.js';

/**
 * Death/collapse VFX for the player ship.
 * Owns flash sphere, shockwave ring, point light, and debris fragments.
 * All geometry is added to / removed from the provided scene.
 */
export function createShipCollapseFx({ scene, origin }) {
  let _fxFlash = null;
  let _fxRing  = null;
  let _fxLight = null;
  let _debrisFrags = [];

  function spawn() {
    const o = origin.clone();

    const flashMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 8,
        transparent: true, opacity: 1, depthWrite: false,
      }),
    );
    flashMesh.position.copy(o);
    flashMesh.layers.enable(1);
    scene.add(flashMesh);
    _fxFlash = { mesh: flashMesh };

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.09, 6, 48),
      new THREE.MeshStandardMaterial({
        color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 4,
        transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    ringMesh.position.copy(o);
    ringMesh.layers.enable(1);
    scene.add(ringMesh);
    _fxRing = { mesh: ringMesh };

    const deathLight = new THREE.PointLight(0xffffff, 10, 25);
    deathLight.position.copy(o);
    scene.add(deathLight);
    _fxLight = { light: deathLight };

    _debrisFrags = [];
    const cols = [COLORS.PLAYER, 0x55c8ff, 0xffffff, 0x8dfcff, 0x3a8bff];
    for (let i = 0; i < 12; i++) {
      const c = cols[i % cols.length];
      const s = 0.28 + Math.random() * 0.52;
      let geo;
      if      (i % 4 === 0) geo = new THREE.OctahedronGeometry(s);
      else if (i % 4 === 1) geo = new THREE.IcosahedronGeometry(s * 1.2, 0);
      else if (i % 4 === 2) geo = new THREE.TetrahedronGeometry(s * 1.5);
      else                  geo = new THREE.ConeGeometry(s * 0.55, s * 2.5, 4);
      const mat = new THREE.MeshStandardMaterial({
        color: c, emissive: c, emissiveIntensity: 4.0,
        transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(o);
      mesh.position.x += (Math.random() - 0.5) * 0.8;
      mesh.position.y += (Math.random() - 0.5) * 0.6;
      mesh.position.z += (Math.random() - 0.5) * 0.6;
      mesh.layers.enable(1);
      scene.add(mesh);
      const spd = 5 + Math.random() * 7;
      const a   = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const vel = new THREE.Vector3(
        Math.cos(a) * spd,
        Math.sin(a) * spd + (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 6,
      );
      const rotV = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      );
      const startT = 0.08 + Math.random() * 0.10;
      const life   = 1.8  + Math.random() * 0.9;
      _debrisFrags.push({ mesh, vel, rotV, age: 0, startT, life });
    }
  }

  // collapseT = raw seconds elapsed since collapse began (not normalized)
  function update(delta, collapseT) {
    if (_fxFlash) {
      const ft = Math.min(1, collapseT / 0.22);
      _fxFlash.mesh.material.opacity = 1 - ft;
      if (ft >= 1) {
        scene.remove(_fxFlash.mesh);
        _fxFlash.mesh.geometry.dispose();
        _fxFlash.mesh.material.dispose();
        _fxFlash = null;
      }
    }

    if (_fxRing) {
      const rt = Math.min(1, collapseT / 0.55);
      _fxRing.mesh.scale.setScalar(0.1 + rt * 8.9);
      _fxRing.mesh.material.opacity = rt < 0.08 ? 1 : Math.max(0, 1 - (rt - 0.08) / 0.92);
      if (rt >= 1) {
        scene.remove(_fxRing.mesh);
        _fxRing.mesh.geometry.dispose();
        _fxRing.mesh.material.dispose();
        _fxRing = null;
      }
    }

    if (_fxLight) {
      const lt = Math.min(1, collapseT / 0.45);
      _fxLight.light.intensity = 10 * (1 - lt);
      if (lt >= 1) {
        scene.remove(_fxLight.light);
        _fxLight = null;
      }
    }

    const t = Math.min(collapseT / 2.8, 1);
    for (const frag of _debrisFrags) {
      if (t < frag.startT) continue;
      frag.age += delta;
      const ft = Math.min(frag.age / frag.life, 1);
      frag.mesh.position.x += frag.vel.x * delta;
      frag.mesh.position.y += frag.vel.y * delta;
      frag.mesh.position.z += frag.vel.z * delta;
      frag.mesh.rotation.x += frag.rotV.x * delta;
      frag.mesh.rotation.y += frag.rotV.y * delta;
      frag.mesh.rotation.z += frag.rotV.z * delta;
      frag.vel.multiplyScalar(1 - delta * 1.1);
      frag.mesh.material.opacity = ft < 0.06 ? ft / 0.06
        : ft > 0.58 ? Math.max(0, 1 - (ft - 0.58) / 0.42)
        : 1;
      frag.mesh.material.emissiveIntensity =
        (2.1 + 0.9 * Math.sin(collapseT * 16 + frag.age * 12)) * (1 - ft * 0.7);
    }
  }

  function cleanup() {
    if (_fxFlash?.mesh) {
      scene.remove(_fxFlash.mesh);
      _fxFlash.mesh.geometry.dispose();
      _fxFlash.mesh.material.dispose();
    }
    if (_fxRing?.mesh) {
      scene.remove(_fxRing.mesh);
      _fxRing.mesh.geometry.dispose();
      _fxRing.mesh.material.dispose();
    }
    if (_fxLight?.light) scene.remove(_fxLight.light);
    for (const f of _debrisFrags) {
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
    }
    _debrisFrags = [];
    _fxFlash = null;
    _fxRing  = null;
    _fxLight = null;
  }

  return { spawn, update, cleanup };
}
