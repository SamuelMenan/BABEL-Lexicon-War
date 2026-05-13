// Stress benchmark — spawn fake activeWords y mide latencia matching.
// Uso: window.__babelStress.run({ count: 1000, mode: 'parallel' })
// Devuelve { mode, count, totalMs, perCallMs, fps } promediado sobre N iteraciones.

import { workerBridge } from '../workers/workerBridge.js';
import { EXECUTION_MODE, WORD_POOL_ES } from '../../shared/constants.js';
import { Bridge } from '../../shared/bridge.js';

function makeFakeWords(n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { id: `e_${i}`, word: WORD_POOL_ES[i % WORD_POOL_ES.length] };
  }
  return out;
}

async function run({ count = 1000, mode = EXECUTION_MODE.PARALLEL, iterations = 60, typed = 'le' } = {}) {
  workerBridge.setMode(mode);
  const words = makeFakeWords(count);
  // warm-up
  await workerBridge.processInput(typed, words);

  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    await workerBridge.processInput(typed, words);
  }
  const totalMs = performance.now() - t0;
  const fps = Bridge.peekState?.()?.perf?.fps ?? null;
  const result = {
    mode, count, iterations,
    totalMs: +totalMs.toFixed(2),
    perCallMs: +(totalMs / iterations).toFixed(3),
    fps,
  };
  console.table([result]);
  return result;
}

async function compare({ count = 1000, iterations = 60 } = {}) {
  const normal   = await run({ count, mode: EXECUTION_MODE.NORMAL,   iterations });
  const parallel = await run({ count, mode: EXECUTION_MODE.PARALLEL, iterations });
  const speedup  = +(normal.perCallMs / parallel.perCallMs).toFixed(2);
  console.log(`[stress] speedup parallel/normal: ${speedup}x`);
  return { normal, parallel, speedup };
}

async function sweep({ sizes = [500, 1000, 1500, 2000], iterations = 40 } = {}) {
  const rows = [];
  for (const count of sizes) {
    const r = await compare({ count, iterations });
    rows.push({
      count,
      normalMs:   r.normal.perCallMs,
      parallelMs: r.parallel.perCallMs,
      speedup:    r.speedup,
      fps:        r.parallel.fps,
    });
  }
  console.table(rows);
  return rows;
}

export const StressTest = { run, compare, sweep };

if (typeof window !== 'undefined') {
  window.__babelStress = StressTest;
}
