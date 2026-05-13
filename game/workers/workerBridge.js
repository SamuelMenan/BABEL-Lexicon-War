// Facade async para lexicon matching. Conmuta NORMAL <-> PARALLEL en runtime.
// NORMAL: ejecuta sync en main thread y envuelve en Promesa resuelta.
// PARALLEL: delega a lexiconWorker (instancia única, reutilizada).

import { EXECUTION_MODE } from '../../shared/constants.js';

const MSG = { PROCESS_INPUT: 'PROCESS_INPUT', RESULT: 'PROCESS_RESULT' };

class LexiconWorkerBridge {
  constructor() {
    this._mode      = EXECUTION_MODE.NORMAL;
    this._worker    = null;
    this._reqId     = 0;
    this._pending   = new Map();
    this._lastWorkerMs = 0;
  }

  setMode(mode) {
    if (mode !== EXECUTION_MODE.NORMAL && mode !== EXECUTION_MODE.PARALLEL) return;
    if (mode === this._mode) return;
    this._mode = mode;
    if (mode === EXECUTION_MODE.NORMAL) this._teardownWorker();
    else this._ensureWorker();
  }

  getMode() { return this._mode; }
  getLastWorkerMs() { return this._lastWorkerMs; }

  _ensureWorker() {
    if (this._worker) return;
    this._worker = new Worker(new URL('./lexiconWorker.js', import.meta.url), { type: 'module' });
    this._worker.onmessage = (e) => {
      const { type, requestId, payload, workerMs } = e.data || {};
      if (type !== MSG.RESULT) return;
      this._lastWorkerMs = workerMs ?? 0;
      const resolver = this._pending.get(requestId);
      if (resolver) { this._pending.delete(requestId); resolver(payload); }
    };
    this._worker.onerror = (err) => {
      console.error('[LexiconWorker] error', err);
      // fallback: rechazar pendientes
      for (const [, resolve] of this._pending) resolve({ matches: [], collapsed: null });
      this._pending.clear();
    };
  }

  _teardownWorker() {
    if (!this._worker) return;
    this._worker.terminate();
    this._worker = null;
    this._pending.clear();
  }

  // Núcleo de matching duplicado en main thread (modo NORMAL).
  _matchSync(typedText, activeWords) {
    const typed = (typedText || '').toLowerCase();
    const matches = [];
    let collapsed = null;
    for (let i = 0; i < activeWords.length; i++) {
      const item = activeWords[i];
      const word = (item.word || '').toLowerCase();
      if (!word) continue;
      if (typed && word.startsWith(typed)) {
        matches.push({ id: item.id, word: item.word, score: typed.length / word.length, prefix: true });
        if (typed.length === word.length && !collapsed) collapsed = { id: item.id, word: item.word };
      }
    }
    matches.sort((a, b) => b.score - a.score);
    return { matches, collapsed };
  }

  processInput(typedText, activeWords) {
    if (this._mode === EXECUTION_MODE.NORMAL) {
      const t0 = performance.now();
      const result = this._matchSync(typedText, activeWords);
      this._lastWorkerMs = performance.now() - t0;
      return Promise.resolve(result);
    }
    this._ensureWorker();
    const requestId = ++this._reqId;
    return new Promise((resolve) => {
      this._pending.set(requestId, resolve);
      this._worker.postMessage({
        type: MSG.PROCESS_INPUT,
        requestId,
        payload: { typedText, activeWords },
      });
    });
  }

  dispose() { this._teardownWorker(); }
}

export const workerBridge = new LexiconWorkerBridge();
