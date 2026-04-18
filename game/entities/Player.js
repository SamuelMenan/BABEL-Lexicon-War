// TYPO-1 — nave del jugador con animaciones de disparo y apuntado

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { COLORS } from '../../shared/constants.js';

export class Player extends Entity {
  constructor() {
    super();
    this._t         = 0;
    this._recoil    = 0;      // 0..1, decae tras disparo
    this._targetPos = null;   // Vector3 del enemigo actual
    this._group     = new THREE.Group();
    this.mesh       = this._group;

    this._engineGlow = null;
    this._muzzle     = null;

    this._build();
  }

  _build() {
    const cyan = COLORS.PLAYER;

    // Cuerpo principal
    const bodyGeo = new THREE.ConeGeometry(0.42, 1.8, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: cyan, emissive: cyan, emissiveIntensity: 0.35,
      metalness: 0.7, roughness: 0.25,
    });
    this._group.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Alas
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       0,    0,   0.4,   1.3, -0.1,  0.9,   0.25, -0.05, -0.6,
       0,    0,   0.4,  -1.3, -0.1,  0.9,  -0.25, -0.05, -0.6,
    ]), 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: cyan, emissive: cyan, emissiveIntensity: 0.15,
      side: THREE.DoubleSide, metalness: 0.8, roughness: 0.2,
    });
    this._group.add(new THREE.Mesh(wingGeo, wingMat));

    // Cañón — punto de salida del disparo
    const muzzleGeo = new THREE.SphereGeometry(0.07, 6, 6);
    const muzzleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: cyan, emissiveIntensity: 0.5,
    });
    this._muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    this._muzzle.position.set(0, 0, -0.95); // punta frontal
    this._group.add(this._muzzle);

    // Motor (cola)
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x88aaff, emissive: 0x4466ff, emissiveIntensity: 1.5,
    });
    this._engineGlow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), engineMat);
    this._engineGlow.position.z = 0.95;
    this._group.add(this._engineGlow);

    // Flash de disparo (oculto por defecto)
    const flashMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: cyan, emissiveIntensity: 4,
      transparent: true, opacity: 0,
    });
    this._flash = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), flashMat);
    this._flash.position.set(0, 0, -0.95);
    this._group.add(this._flash);

    // Luz puntual de la nave
    this._light = new THREE.PointLight(cyan, 2, 10);
    this._group.add(this._light);

    this._group.position.set(0, 0, 2);
  }

  // Llamado desde SceneManager con posición del target actual
  setTarget(pos) { this._targetPos = pos; }
  clearTarget()  { this._targetPos = null; }

  // Retorna posición mundial del cañón (para origen del proyectil)
  get muzzlePosition() {
    const pos = new THREE.Vector3();
    this._muzzle.getWorldPosition(pos);
    return pos;
  }

  // Animación de disparo — recoil + flash
  fireAnim() {
    this._recoil = 1;
    this._flash.material.opacity = 1;
    setTimeout(() => { this._flash.material.opacity = 0; }, 80);
  }

  update(delta) {
    this._t += delta;

    // Flotación arriba/abajo pronunciada
    const floatY = Math.sin(this._t * 1.2) * 0.6;
    this._group.position.y = floatY;

    // Deslizamiento en X hacia el objetivo
    const desiredX = this._targetPos ? this._targetPos.x * 0.18 : 0;
    this._group.position.x += (desiredX - this._group.position.x) * Math.min(delta * 2, 1);

    // Apuntar suavemente hacia el target
    if (this._targetPos) {
      const dir = new THREE.Vector3()
        .subVectors(this._targetPos, this._group.position)
        .normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1), dir,
      );
      this._group.quaternion.slerp(targetQuat, delta * 3);
    } else {
      // Sin target → volver a orientación neutra
      this._group.quaternion.slerp(new THREE.Quaternion(), delta * 2);
    }

    // Recoil hacia atrás al disparar
    if (this._recoil > 0) {
      this._group.position.z = 2 + this._recoil * 0.4;
      this._recoil = Math.max(0, this._recoil - delta * 8);
    } else {
      this._group.position.z = 2 + Math.sin(this._t * 0.35) * 0.05;
    }

    // Pulso del motor — se intensifica con recoil
    const enginePulse = 1.2 + Math.sin(this._t * 4) * 0.3 + this._recoil;
    this._engineGlow.material.emissiveIntensity = enginePulse;
    const engineScale = 1 + Math.sin(this._t * 4) * 0.15;
    this._engineGlow.scale.setScalar(engineScale);

    // Luz pulsa también
    this._light.intensity = 1.5 + Math.sin(this._t * 3) * 0.5 + this._recoil * 2;
  }
}
