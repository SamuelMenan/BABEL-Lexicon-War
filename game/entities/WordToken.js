// Etiqueta 2D con la palabra-núcleo del enemigo, renderizada sobre canvas HUD
// La posición 3D del enemigo se convierte a coordenadas de pantalla cada frame.
// El DOM lo maneja HUDCanvas.js — WordToken solo expone los datos.

export class WordToken {
  constructor(enemy) {
    this.enemy   = enemy;
    this.word    = enemy.word;
    this.typed   = '';       // letras completadas
    this.visible = true;
  }

  update(typed) {
    this.typed = typed;
  }

  // Coordenadas de pantalla — calculadas por HUDCanvas con cámara
  screenPos(camera, width, height) {
    WordToken._tempPos.copy(this.enemy.position);
    WordToken._tempPos.y += 1.2; // offset sobre el enemigo

    WordToken._tempPos.project(camera);

    return {
      x: (WordToken._tempPos.x * 0.5 + 0.5) * width,
      y: (-WordToken._tempPos.y * 0.5 + 0.5) * height,
    };
  }
}

import * as THREE from 'three';
WordToken._tempPos = new THREE.Vector3();
