// Canvas 2D superpuesto — dibuja etiquetas de palabras sobre los enemigos

export class HUDCanvas {
  constructor() {
    this.canvas  = document.createElement('canvas');
    this.ctx     = this.canvas.getContext('2d');
    this.tokens  = [];   // WordToken[]
    this.camera  = null;

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
    const { x, y } = token.screenPos(this.camera, width, height);
    const word      = token.word;
    const typed     = token.typed.length;
    const fontSize  = 18;
    const charW     = fontSize * 0.62; // approx monospace

    this.ctx.font = `${fontSize}px 'Courier New', monospace`;
    this.ctx.textAlign = 'center';

    const totalWidth = word.length * charW;
    const startX     = x - totalWidth / 2 + charW / 2;

    for (let i = 0; i < word.length; i++) {
      this.ctx.fillStyle = i < typed ? '#00ff88' : '#888888';
      this.ctx.fillText(word[i], startX + i * charW, y);
    }
  }
}
