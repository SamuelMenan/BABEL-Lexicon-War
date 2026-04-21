import * as THREE from 'three';
import { getSoftGlowTexture } from '../../shared/softVisuals.js';
import { BLOOM_LAYER } from '../../shared/constants.js';

export class Starfield {
  constructor(scene) {
    this._scene = scene;
  }

  addStarField(count, spread, size, color, opacity = 1) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * spread * 2;
      pos[i*3+1] = (Math.random() - 0.5) * spread;
      pos[i*3+2] = (Math.random() - 0.5) * spread * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, sizeAttenuation: true, transparent: true, opacity,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    }));
    stars.layers.enable(BLOOM_LAYER);
    this._scene.add(stars);
  }

  addStarCluster(cx, cy, cz, count, radius, size, color, opacity = 1) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r   = radius * Math.cbrt(Math.random());
      const th  = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = cx + r * Math.sin(phi) * Math.cos(th);
      pos[i*3+1] = cy + r * Math.sin(phi) * Math.sin(th);
      pos[i*3+2] = cz + r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, sizeAttenuation: true, transparent: true, opacity,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    }));
    pts.layers.enable(BLOOM_LAYER);
    this._scene.add(pts);
  }

  addMilkyWay() {
    const glowTex = getSoftGlowTexture();
    const addBand = (count, buildPos, matOpts) => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) buildPos(pos, i);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        sizeAttenuation: true, transparent: true,
        map: glowTex, alphaMap: glowTex,
        depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
        ...matOpts,
      });
      const band = new THREE.Points(geo, mat);
      band.frustumCulled = false;
      band.layers.enable(BLOOM_LAYER);
      this._scene.add(band);
    };

    addBand(5000, (pos, i) => {
      const t = (Math.random() - 0.5) * 2, perp = (Math.random() - 0.5) * 55, thick = (Math.random() - 0.5) * 18;
      pos[i*3] = t * 1100 + perp * 0.2; pos[i*3+1] = thick + perp * 0.08; pos[i*3+2] = -500 + t * 80 + perp * 0.4;
    }, { color: 0xbbccee, size: 0.18, opacity: 0.55 });

    addBand(4000, (pos, i) => {
      const t = (Math.random() - 0.5) * 2, thick = (Math.random() - 0.5) * 16, perp = (Math.random() - 0.5) * 30;
      pos[i*3] = t * 1100 + perp * 0.1; pos[i*3+1] = thick + perp * 0.04; pos[i*3+2] = -380 + t * 90 + perp * 0.3;
    }, { color: 0xdde8ff, size: 0.30, opacity: 0.75 });

    addBand(4000, (pos, i) => {
      const t = (Math.random() - 0.5) * 2, perp = (Math.random() - 0.5) * 55, thick = (Math.random() - 0.5) * 26;
      pos[i*3] = t * 1000 + perp * 0.3; pos[i*3+1] = thick + t * 280; pos[i*3+2] = -300 + t * 140 + perp * 0.5;
    }, { color: 0xbbccee, size: 0.18, opacity: 0.55 });

    addBand(1200, (pos, i) => {
      const t = (Math.random() - 0.5) * 2, perp = (Math.random() - 0.5) * 20;
      pos[i*3] = t * 900 + perp * 0.15; pos[i*3+1] = (Math.random() - 0.5) * 10 + perp * 0.05; pos[i*3+2] = -500 + t * 60 + perp * 0.3;
    }, { color: 0xdde8ff, size: 0.28, opacity: 0.70 });

    addBand(3500, (pos, i) => {
      const t = (Math.random() - 0.5) * 2, thick = (Math.random() - 0.5) * 20, perp = (Math.random() - 0.5) * 40;
      pos[i*3] = t * 1100 + perp * 0.15; pos[i*3+1] = thick + perp * 0.05; pos[i*3+2] = -78 + t * 60 + perp * 0.3;
    }, { color: 0xdde8ff, size: 0.22, opacity: 0.65 });
  }

  addNebula(x, y, z, color, opacity, radius, side = THREE.FrontSide) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), mat);
    mesh.layers.enable(BLOOM_LAYER);
    mesh.position.set(x, y, z);
    this._scene.add(mesh);
  }

  addNebulaSolid(x, y, z, color, radius) {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat);
    mesh.position.set(x, y, z);
    this._scene.add(mesh);
  }

  addNebulaGlow(x, y, z, color, opacity, radius) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), mat);
    mesh.layers.enable(BLOOM_LAYER);
    mesh.position.set(x, y, z);
    this._scene.add(mesh);
  }

  addBackgroundVoid(color, radius) {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, depthWrite: false });
    this._scene.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), mat));
  }

  addDistantPlanet(x, y, z, radius, colorTop) {
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 24),
      new THREE.MeshStandardMaterial({ color: colorTop, emissive: colorTop, emissiveIntensity: 0.08, roughness: 0.9, metalness: 0.0 })
    );
    planet.position.set(x, y, z);
    this._scene.add(planet);

    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.18, 20, 20),
      new THREE.MeshBasicMaterial({ color: colorTop, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    atm.position.set(x, y, z);
    atm.layers.enable(BLOOM_LAYER);
    this._scene.add(atm);
  }

  // Returns mesh so caller can track it for animation
  addDecorRing(x, y, z, radius, color) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.08, 6, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
    );
    mesh.layers.enable(BLOOM_LAYER);
    mesh.position.set(x, y, z);
    mesh.rotation.x = Math.PI / 2;
    this._scene.add(mesh);
    return mesh;
  }
}
