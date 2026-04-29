import * as THREE from 'three';

// Canvas 2D superpuesto — dibuja etiquetas de palabras sobre los enemigos

export class HUDCanvas {
  constructor() {
    this.canvas  = document.createElement('canvas');
    this.ctx     = this.canvas.getContext('2d');
    this.tokens  = [];   // WordToken[]
    this.camera  = null;
    this.occluders = []; // [{ object: THREE.Object3D, radiusPx?: number }]

    Object.assign(this.canvas.style, {
      position:      'fixed',
      top:           '0',
      left:          '0',
      width:         '100%',
      height:        '100%',
      pointerEvents: 'none',
      zIndex:        '5',
    });
  }

  mount() {
    document.getElementById('game-canvas').appendChild(this.canvas);
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setCamera(camera) { this.camera = camera; }
  setTokens(tokens) { this.tokens = tokens; }
  setOccluders(occluders) { this.occluders = Array.isArray(occluders) ? occluders : []; }

  update(_delta) {
    if (!this.camera) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    for (const token of this.tokens) {
      if (!token.visible || !token.enemy.active) continue;
      this._drawToken(token, width, height);
    }
  }

  _drawToken(token, width, height) {
    if (this._isOccludedByForeground(token, width, height)) return;

    const { x, y } = token.screenPos(this.camera, width, height);
    const word      = token.word;
    const typed     = token.typed.length;
    const isTargeted = !!token?.enemy?.targeted;
    const fontSize  = isTargeted ? 16 : 15;

    this.ctx.font = `700 ${fontSize}px 'Orbitron', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const charW = this.ctx.measureText('M').width * 0.86;

    const totalWidth = word.length * charW;
    const startX     = x - totalWidth / 2 + charW / 2;
    const drawY = y - 16;

    for (let i = 0; i < word.length; i++) {
      const isDone = i < typed;
      const isCurrent = i === typed;
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = 'rgba(3,8,12,0.95)';
      this.ctx.shadowBlur = isDone ? 11 : isCurrent ? 8 : 5;
      this.ctx.shadowColor = isDone
        ? (isTargeted ? 'rgba(0,255,204,0.88)' : 'rgba(0,255,204,0.6)')
        : isCurrent
          ? 'rgba(130,255,234,0.45)'
          : 'rgba(178,205,230,0.26)';
      this.ctx.fillStyle = isDone ? '#00ffcc' : isCurrent ? '#b9fff3' : 'rgba(205,220,235,0.82)';
      this.ctx.strokeText(word[i], startX + i * charW, drawY);
      this.ctx.fillText(word[i], startX + i * charW, drawY);
    }

    this.ctx.shadowBlur = 0;
  }

  _isOccludedByForeground(token, width, height) {
    if (!this.occluders.length || !this.camera) return false;
    const enemyPos = token?.enemy?.position;
    if (!enemyPos) return false;

    HUDCanvas._tempNdc1.copy(enemyPos).project(this.camera);
    if (HUDCanvas._tempNdc1.z < -1 || HUDCanvas._tempNdc1.z > 1) return false;

    for (const entry of this.occluders) {
      const obj = entry?.object;
      if (!obj) continue;
      
      let occWorld = HUDCanvas._tempNdc2;
      if (obj.getWorldPosition) {
        obj.getWorldPosition(occWorld);
      } else if (obj.position) {
        occWorld.copy(obj.position);
      } else {
        continue;
      }
      
      occWorld.project(this.camera);
      if (occWorld.z < -1 || occWorld.z > 1) continue;

      // Occluder must be closer to camera than enemy label target.
      if (occWorld.z >= HUDCanvas._tempNdc1.z) continue;

      const occX = (occWorld.x * 0.5 + 0.5) * width;
      const occY = (-occWorld.y * 0.5 + 0.5) * height;
      const enemyX = (HUDCanvas._tempNdc1.x * 0.5 + 0.5) * width;
      const enemyY = (-HUDCanvas._tempNdc1.y * 0.5 + 0.5) * height;
      const radiusPx = entry.radiusPx ?? 170;
      const dx = enemyX - occX;
      const dy = enemyY - occY;
      if ((dx * dx + dy * dy) <= radiusPx * radiusPx) return true;
    }

    return false;
  }
}

import * as THREE from 'three';
HUDCanvas._tempNdc1 = new THREE.Vector3();
HUDCanvas._tempNdc2 = new THREE.Vector3();
