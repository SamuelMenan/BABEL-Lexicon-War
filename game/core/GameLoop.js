// Loop principal del motor — requestAnimationFrame

export class GameLoop {
  constructor() {
    this._running   = false;
    this._rafId     = null;
    this._lastTime  = 0;
    this._systems   = [];
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
    const delta = (now - this._lastTime) / 1000; // segundos
    this._lastTime = now;

    for (const system of this._systems) {
      system.update?.(delta);
    }

    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }
}
