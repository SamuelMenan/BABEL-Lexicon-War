// Loop principal del motor — requestAnimationFrame
import Stats from 'three/examples/jsm/libs/stats.module.js';

export class GameLoop {
  constructor() {
    this._running   = false;
    this._rafId     = null;
    this._lastTime  = 0;
    this._systems   = [];

    this._stats = new Stats();
    this._stats.showPanel(0);
    this._stats.dom.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;';
    document.body.appendChild(this._stats.dom);
  }

  addSystem(system) {
    this._systems.push(system);
  }

  start() {
    if (this._running) return;
    this._running  = true;
    this._lastTime = performance.now();
    this._tick(this._lastTime);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  _tick(now) {
    if (!this._running) return;
    this._stats.begin();
    const delta = (now - this._lastTime) / 1000; // segundos
    this._lastTime = now;

    for (const system of this._systems) {
      system.update?.(delta);
    }

    this._stats.end();
    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }
}
