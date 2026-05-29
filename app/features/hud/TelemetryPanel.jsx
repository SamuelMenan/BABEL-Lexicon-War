import React, { useEffect, useState } from 'react';
import { Bridge } from '@shared/state/bridge.js';

const EMPTY = { fps: 0, frameMsAvg: 0, frameMsMax: 0, heapMB: null, heapTotalMB: null, heapLimitMB: null, memSupported: false };

function readVisible(s) { return s.telemetryVisible !== false; }

function fpsColor(fps) {
  if (fps >= 55) return '#5cff9a';
  if (fps >= 40) return '#ffd24a';
  return '#ff5a5a';
}

export default function TelemetryPanel() {
  const [t, setT] = useState(() => Bridge.peekState().telemetry || EMPTY);
  const [visible, setVisible] = useState(() => readVisible(Bridge.peekState()));

  useEffect(() => {
    return Bridge.onStateChange(s => {
      if (s.telemetry) setT(s.telemetry);
      setVisible(readVisible(s));
    });
  }, []);

  if (!visible) return null;

  const fps = t.fps ?? 0;
  const heap = t.heapMB;
  const heapPct = (heap != null && t.heapLimitMB) ? Math.round((heap / t.heapLimitMB) * 100) : null;

  return (
    <div className="telemetry-panel" data-testid="telemetry-panel">
      <div className="telemetry-row">
        <span className="telemetry-label">FPS</span>
        <span className="telemetry-value" style={{ color: fpsColor(fps) }}>{fps}</span>
      </div>
      <div className="telemetry-row">
        <span className="telemetry-label">FRAME</span>
        <span className="telemetry-value">{(t.frameMsAvg ?? 0).toFixed(1)} / {(t.frameMsMax ?? 0).toFixed(1)} ms</span>
      </div>
      <div className="telemetry-row">
        <span className="telemetry-label">HEAP</span>
        <span className="telemetry-value">
          {t.memSupported
            ? `${heap?.toFixed?.(1) ?? '—'} MB${heapPct != null ? ` (${heapPct}%)` : ''}`
            : 'n/a'}
        </span>
      </div>
      {t.memSupported && t.heapLimitMB ? (
        <div className="telemetry-row telemetry-row--sub">
          <span className="telemetry-label">LIMIT</span>
          <span className="telemetry-value">{t.heapLimitMB} MB</span>
        </div>
      ) : null}
    </div>
  );
}
