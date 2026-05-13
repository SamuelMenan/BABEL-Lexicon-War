// Loop principal del motor — requestAnimationFrame
// Mide FPS y tiempo de bloqueo del main thread (frame work duration en ms).

import { Bridge } from '../../shared/bridge.js';
import { waveTrace } from '../debug/WaveTrace.js';

const PERF_PUBLISH_MS = 250; // 4 Hz

export class GameLoop {
  constructor() {
    this._running   = false;
    this._rafId     = null;
    this._lastTime  = 0;
    this._systems   = [];
    // Perf samples (rolling)
    this._frameCount   = 0;
    this._publishAcc   = 0;
    this._blockMaxMs   = 0;
    this._blockSumMs   = 0;
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

    const workStart = performance.now();
    for (const system of this._systems) {
      system.update?.(delta);
    }
    const workMs = performance.now() - workStart;
    // Real frame duration = delta*1000 (incluye GPU del frame anterior + JS).
    waveTrace.recordFrame(delta * 1000);

    this._frameCount++;
    this._publishAcc += (delta * 1000);
    this._blockSumMs += workMs;
    if (workMs > this._blockMaxMs) this._blockMaxMs = workMs;

    if (this._publishAcc >= PERF_PUBLISH_MS) {
      const fps      = Math.round((this._frameCount * 1000) / this._publishAcc);
      const blockAvg = this._blockSumMs / this._frameCount;
      Bridge.setState({
        perf: {
          fps,
          frameMsAvg: +blockAvg.toFixed(2),
          frameMsMax: +this._blockMaxMs.toFixed(2),
        },
      });
      this._frameCount = 0;
      this._publishAcc = 0;
      this._blockSumMs = 0;
      this._blockMaxMs = 0;
    }

    this._rafId = requestAnimationFrame((t) => this._tick(t));
  }
}
