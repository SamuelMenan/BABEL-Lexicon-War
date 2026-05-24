import React, { useEffect, useState } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import { fetchLeaderboard, isLeaderboardSyncAvailable } from '../../services/supabase/leaderboard.js';

const PERIODS = [
  { value: 'day',   label: 'Diario' },
  { value: 'week',  label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
];
const MODES = [
  { value: 'combat', label: 'Combate' },
  { value: 'racing', label: 'Carrera' },
];

const fmt = new Intl.NumberFormat('es-ES');

export default function LeaderboardModal({ onClose }) {
  const [period, setPeriod] = useState('week');
  const [mode,   setMode]   = useState('combat');
  const [rows,    setRows]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    KeybindService.pushScope('modal');
    const offCancel = KeybindService.register('modal', 'CANCEL', () => onClose?.());
    return () => { offCancel(); KeybindService.popScope('modal'); };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    fetchLeaderboard({ period, mode, limit: 10 })
      .then(({ rows: nextRows, skipped }) => {
        if (!alive) return;
        setRows(nextRows ?? []);
        if (skipped) setError('Configura Supabase para ver rankings en vivo.');
      })
      .catch((err) => {
        if (!alive) return;
        setRows([]);
        setError(err?.message || 'No se pudo cargar la clasificación.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period, mode]);

  const available = isLeaderboardSyncAvailable();

  return (
    <div className="lb-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="lb-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="lb-modal__header">
          <span className="lb-modal__label">◈ CLASIFICACIÓN · TOP 10</span>
          <button type="button" className="lb-modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="lb-modal__controls">
          <div className="lb-modal__group">
            <span className="lb-modal__group-label">PERIODO</span>
            <div className="lb-modal__chips">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`lb-modal__chip${period === p.value ? ' lb-modal__chip--active' : ''}`}
                  onClick={() => setPeriod(p.value)}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <div className="lb-modal__group">
            <span className="lb-modal__group-label">MODO</span>
            <div className="lb-modal__chips">
              {MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  className={`lb-modal__chip${mode === m.value ? ' lb-modal__chip--active' : ''}`}
                  onClick={() => setMode(m.value)}
                >{m.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="lb-modal__body">
          {loading && <div className="lb-modal__state">Cargando clasificación…</div>}
          {!loading && error && <div className="lb-modal__state lb-modal__state--err">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="lb-modal__state">Sin partidas registradas para este filtro.</div>
          )}
          {!loading && !error && rows.map((row) => {
            const isCombat = mode === 'combat';
            const primary  = isCombat ? (row.max_wave ?? row.best_score ?? 0) : (row.best_score ?? 0);
            const primaryLabel = isCombat ? 'OLEADA' : 'MEJOR';
            return (
              <div key={`${row.player_id}-${row.rank}`} className="lb-row">
                <div className="lb-row__rank">#{row.rank}</div>
                <div className="lb-row__main">
                  <div className="lb-row__name">{row.display_name}</div>
                  <div className="lb-row__sub">
                    {fmt.format(row.games_played ?? 0)} partidas · Total {fmt.format(row.total_score ?? 0)}
                  </div>
                  <div className="lb-row__sub">
                    WPM medio {Math.round(row.avg_wpm ?? 0)} · Precisión {Math.round(row.avg_accuracy ?? 0)}% · Pico {Math.round(row.max_peak_wpm ?? 0)}
                  </div>
                </div>
                <div className="lb-row__score">
                  <div className="lb-row__score-val">{fmt.format(primary)}</div>
                  <div className="lb-row__score-lbl">{primaryLabel}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lb-modal__footer">
          <span className="lb-modal__status">{available ? '◉ Supabase activo' : '○ Solo vista local'}</span>
          <span className="lb-modal__hint">ESC cerrar</span>
        </div>
      </div>
    </div>
  );
}
