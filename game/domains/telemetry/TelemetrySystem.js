// TelemetrySystem — unica fuente de FPS / frame ms / heap JS.
// Publica `telemetry` en Bridge a 4 Hz. Lectura por TelemetryPanel.jsx.

import { Bridge } from '../../shared/bridge.js';

const SAMPLE_MS = 250;
const BYTES_PER_MB = 1024 * 1024;

class TelemetrySystemImpl {
  constructor() {
    this._acc = 0;
    this._frames = 0;
    this._frameMsSum = 0;
    this._frameMsMax = 0;
    this._enabled = true;
  }

  setEnabled(v) { this._enabled = !!v; }
  isEnabled()   { return this._enabled; }

  update(delta) {
    if (!this._enabled) return;

    const ms = delta * 1000;
    this._acc        += ms;
    this._frames     += 1;
    this._frameMsSum += ms;
    if (ms > this._frameMsMax) this._frameMsMax = ms;

    if (this._acc < SAMPLE_MS) return;

    const fps        = Math.round((this._frames * 1000) / this._acc);
    const frameMsAvg = this._frameMsSum / this._frames;
    const frameMsMax = this._frameMsMax;

    const mem = performance.memory;
    const heapMB      = mem ? +(mem.usedJSHeapSize  / BYTES_PER_MB).toFixed(1) : null;
    const heapTotalMB = mem ? +(mem.totalJSHeapSize / BYTES_PER_MB).toFixed(1) : null;
    const heapLimitMB = mem ? +(mem.jsHeapSizeLimit / BYTES_PER_MB).toFixed(0) : null;

    Bridge.setState({
      telemetry: {
        fps,
        frameMsAvg: +frameMsAvg.toFixed(2),
        frameMsMax: +frameMsMax.toFixed(2),
        heapMB,
        heapTotalMB,
        heapLimitMB,
        memSupported: !!mem,
        t: performance.now(),
      },
    });

    this._acc = 0;
    this._frames = 0;
    this._frameMsSum = 0;
    this._frameMsMax = 0;
  }
}

export const TelemetrySystem = new TelemetrySystemImpl();

if (typeof window !== 'undefined') {
  window.__telemetry = TelemetrySystem;
}
