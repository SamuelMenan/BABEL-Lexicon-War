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
    const pos = this.enemy.position.clone();
    pos.y += 1.2; // offset sobre el enemigo

    pos.project(camera);

    return {
      x: (pos.x * 0.5 + 0.5) * width,
      y: (-pos.y * 0.5 + 0.5) * height,
    };
  }
}
