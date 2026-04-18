// TYPO-1 — nave del jugador en el centro de la escena

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { COLORS } from '../../shared/constants.js';

export class Player extends Entity {
  constructor() {
    super();
    this._t      = 0;
    this._group  = new THREE.Group();
    this.mesh    = this._group;

    this._build();
  }

  _build() {
    const cyan = COLORS.PLAYER;

    // Cuerpo principal — cono apuntando hacia los enemigos (eje -Z)
    const bodyGeo = new THREE.ConeGeometry(0.4, 1.6, 6);
    bodyGeo.rotateX(Math.PI / 2); // apunta hacia -Z
    const bodyMat = new THREE.MeshStandardMaterial({
      color:     cyan,
      emissive:  cyan,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this._group.add(body);

    // Alas — dos planos inclinados
    const wingGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      // ala derecha
       0,  0,  0.3,
       1.2, -0.1, 0.8,
       0.2, -0.05, -0.5,
      // ala izquierda
       0,  0,  0.3,
      -1.2, -0.1, 0.8,
      -0.2, -0.05, -0.5,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color:     cyan,
      emissive:  cyan,
      emissiveIntensity: 0.2,
      side:      THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.2,
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    this._group.add(wings);

    // Motor — esfera brillante en la cola
    const engineGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const engineMat = new THREE.MeshStandardMaterial({
      color:             0x88aaff,
      emissive:          0x4466ff,
      emissiveIntensity: 1.5,
    });
    const engineMesh = new THREE.Mesh(engineGeo, engineMat);
    engineMesh.position.z = 0.85;
    this._group.add(engineMesh);

    // Luz puntual que irradia desde la nave
    const light = new THREE.PointLight(cyan, 2, 8);
    this._group.add(light);

    this._group.position.set(0, 0, 2);
  }

  update(delta) {
    this._t += delta;
    // Leve inclinación rítmica
    this._group.rotation.z = Math.sin(this._t * 0.4) * 0.06;
    this._group.rotation.x = Math.sin(this._t * 0.3) * 0.03;
  }
}
