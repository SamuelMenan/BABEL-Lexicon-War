// Instrumentación de wave-start FPS drops.
// Activar/desactivar: window.__waveTrace.enable() / .disable()
// Resumen por oleada: window.__waveTrace.report()
// Auto-report al cerrar oleada (beginWave después de una activa).

class WaveTrace {
  constructor() {
    this.enabled = false;
    this._samples = []; // [{ wave, label, ms, meta }]
    this._currentWave = 0;
    this._waveStart = 0;
    // Frame duration tracking around wave start.
    this._frameMs = []; // [{wave, idx, ms, sinceStart}]
    this._frameIdx = 0;
    this._frameRecordUntil = 0;
  }

  // Llamar desde GameLoop con ms del frame anterior.
  recordFrame(frameMs) {
    if (!this.enabled) return;
    if (performance.now() > this._frameRecordUntil) return;
    this._frameMs.push({
      wave: this._currentWave,
      idx: this._frameIdx++,
      ms: +frameMs.toFixed(2),
      sinceStart: +(performance.now() - this._waveStart).toFixed(0),
    });
  }

  enable()  {
    this.enabled = true;
    this._installLongTaskObserver();
    console.info('[WaveTrace] enabled');
  }
  disable() {
    this.enabled = false;
    this._lto?.disconnect?.();
    this._lto = null;
    console.info('[WaveTrace] disabled');
  }
  clear()   {
    this._samples.length = 0;
    this._frameMs.length = 0;
    this._longTasks = [];
  }

  _installLongTaskObserver() {
    if (this._lto || typeof PerformanceObserver === 'undefined') return;
    this._longTasks = this._longTasks || [];
    try {
      this._lto = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this._longTasks.push({
            wave: this._currentWave,
            sinceStartMs: +(entry.startTime - this._waveStart).toFixed(0),
            durationMs: +entry.duration.toFixed(1),
            name: entry.name,
            attribution: entry.attribution?.[0]?.name ?? '?',
          });
        }
      });
      this._lto.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('[WaveTrace] longtask observer unavailable', e);
    }
  }

  reportLongTasks(waveFilter = null) {
    const list = waveFilter != null
      ? (this._longTasks ?? []).filter(t => t.wave === waveFilter)
      : (this._longTasks ?? []);
    console.table(list.slice(-30));
    console.log('LONGTASK_JSON', JSON.stringify(list.slice(-30)));
    return list;
  }

  beginWave(n) {
    if (!this.enabled) return;
    // Auto-report al cambiar de oleada (excepto en wave 1).
    if (this._currentWave > 0) this.report();
    this._currentWave = n;
    this._waveStart   = performance.now();
    this._frameIdx    = 0;
    // Captura 3s de frames desde el inicio de oleada (≈ 180 frames a 60fps, 450 a 144fps).
    this._frameRecordUntil = this._waveStart + 3000;
    this._samples.push({ wave: n, label: '__WAVE_START__', ms: 0, meta: { abs: this._waveStart } });
  }

  // Mide el callback. Devuelve su return value.
  bracket(label, fn, meta = null) {
    if (!this.enabled) return fn();
    const t0 = performance.now();
    const out = fn();
    const ms = performance.now() - t0;
    this._samples.push({ wave: this._currentWave, label, ms: +ms.toFixed(3), meta });
    return out;
  }

  // Mark sin medición — eventos discretos.
  mark(label, meta = null) {
    if (!this.enabled) return;
    this._samples.push({ wave: this._currentWave, label, ms: 0, meta });
  }

  // Resumen por oleada: top-N pasos más costosos + agregados por label.
  report(waveFilter = null) {
    if (this._samples.length === 0) { console.info('[WaveTrace] sin datos'); return; }
    const filtered = waveFilter != null
      ? this._samples.filter(s => s.wave === waveFilter)
      : this._samples;

    // Agregado por label
    const byLabel = new Map();
    for (const s of filtered) {
      if (s.label.startsWith('__')) continue;
      const e = byLabel.get(s.label) ?? { count: 0, total: 0, max: 0 };
      e.count++; e.total += s.ms; e.max = Math.max(e.max, s.ms);
      byLabel.set(s.label, e);
    }
    const agg = [...byLabel.entries()]
      .map(([label, e]) => ({ label, count: e.count, totalMs: +e.total.toFixed(2), avgMs: +(e.total/e.count).toFixed(3), maxMs: +e.max.toFixed(3) }))
      .sort((a, b) => b.totalMs - a.totalMs);

    // Top-10 individuales
    const top = [...filtered]
      .filter(s => s.ms > 0.5)
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 10)
      .map(s => ({ wave: s.wave, label: s.label, ms: s.ms, meta: s.meta }));

    // Frame spikes durante ventana de wave (peor frame del trace).
    const frameStats = (waveFilter != null)
      ? this._frameMs.filter(f => f.wave === waveFilter)
      : this._frameMs;
    const worstFrames = frameStats
      .toSorted((a, b) => b.ms - a.ms)
      .slice(0, 8)
      .map(f => ({ wave: f.wave, frameIdx: f.idx, ms: f.ms, sinceStartMs: f.sinceStart }));

    console.group(`[WaveTrace] resumen wave=${waveFilter ?? 'ALL'}`);
    console.log('Aggregado por label:'); console.table(agg);
    console.log('Top 10 JS samples (>0.5ms):'); console.table(top);
    console.log('Worst frames (GPU+JS render):'); console.table(worstFrames);
    // Dump JSON — log file captura strings, no tablas colapsadas.
    console.log('JSON_DUMP', JSON.stringify({ wave: waveFilter ?? 'ALL', agg, top, worstFrames }));
    console.groupEnd();
    return { agg, top, worstFrames };
  }

  // Helper para que callers comparen runs.
  dumpRaw() { return this._samples.slice(); }
}

export const waveTrace = new WaveTrace();
if (typeof window !== 'undefined') window.__waveTrace = waveTrace;
