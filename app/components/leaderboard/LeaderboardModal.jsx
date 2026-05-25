import React, { useEffect, useState } from 'react';
import { KeybindService } from '../../../shared/keybindService.js';
import {
  fetchLeaderboard, fetchOnlineWinsLeaderboard, isLeaderboardSyncAvailable,
} from '../../../game/services/supabase/leaderboard.js';
import KeyHint from '../common/KeyHint.jsx';
import Icon from '../common/Icon.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';
import { getNumberFormatter } from '../../../shared/i18n/index.js';

export default function LeaderboardModal({ onClose }) {
  const { t } = useTranslation();
  const fmt = getNumberFormatter();

  const [period, setPeriod] = useState('week');
  const [mode,   setMode]   = useState('combat');
  const [rows,    setRows]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const PERIODS = [
    { value: 'day',   label: t('leaderboard.periods.day') },
    { value: 'week',  label: t('leaderboard.periods.week') },
    { value: 'month', label: t('leaderboard.periods.month') },
  ];
  const MODES = [
    { value: 'combat',       label: t('leaderboard.modes.combat') },
    { value: 'racing',       label: t('leaderboard.modes.racing') },
    { value: 'online-wins',  label: t('leaderboard.modes.onlineWins') },
  ];

  useEffect(() => {
    KeybindService.pushScope('modal');
    const offCancel = KeybindService.register('modal', 'CANCEL', () => onClose?.());
    return () => { offCancel(); KeybindService.popScope('modal'); };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    const fetcher = mode === 'online-wins'
      ? fetchOnlineWinsLeaderboard({ limit: 10 })
      : fetchLeaderboard({ period, mode, limit: 10 });
    fetcher
      .then(({ rows: nextRows, skipped }) => {
        if (!alive) return;
        setRows(nextRows ?? []);
        if (skipped) setError(t('leaderboard.configWarn'));
      })
      .catch((err) => {
        if (!alive) return;
        setRows([]);
        setError(err?.message || t('leaderboard.loadError'));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period, mode, t]);

  const available = isLeaderboardSyncAvailable();

  return (
    <div className="lb-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="lb-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="lb-modal__header">
          <span className="lb-modal__label">◈ {t('leaderboard.label')}</span>
          <button type="button" className="lb-modal__close" onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={16} /></button>
        </div>

        <div className="lb-modal__controls">
          <div className="lb-modal__group" style={mode === 'online-wins' ? { opacity: 0.4, pointerEvents: 'none' } : null}>
            <span className="lb-modal__group-label">{t('leaderboard.period')}</span>
            <div className="lb-modal__chips">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`lb-modal__chip${period === p.value ? ' lb-modal__chip--active' : ''}`}
                  onClick={() => setPeriod(p.value)}
                  disabled={mode === 'online-wins'}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <div className="lb-modal__group">
            <span className="lb-modal__group-label">{t('leaderboard.mode')}</span>
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
          {loading && <div className="lb-modal__state">{t('leaderboard.loading')}</div>}
          {!loading && error && <div className="lb-modal__state lb-modal__state--err">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="lb-modal__state">{t('leaderboard.noRows')}</div>
          )}
          {!loading && !error && rows.map((row, idx) => {
            if (mode === 'online-wins') {
              return (
                <div key={`${row.player_id}-${idx}`} className="lb-row">
                  <div className="lb-row__rank">#{idx + 1}</div>
                  <div className="lb-row__main">
                    <div className="lb-row__name">{row.display_name}</div>
                    <div className="lb-row__sub">
                      {t('leaderboard.totalLine', { n: fmt.format(row.matches ?? 0), total: fmt.format(row.wins ?? 0) })} · {t('leaderboard.winRate', { pct: row.win_rate ?? 0 })}
                    </div>
                  </div>
                  <div className="lb-row__score">
                    <div className="lb-row__score-val">{fmt.format(row.wins ?? 0)}</div>
                    <div className="lb-row__score-lbl">{t('leaderboard.wins')}</div>
                  </div>
                </div>
              );
            }
            const isCombat = mode === 'combat';
            const primary  = isCombat ? (row.max_wave ?? row.best_score ?? 0) : (row.best_score ?? 0);
            const primaryLabel = isCombat ? t('leaderboard.wave') : t('leaderboard.best');
            return (
              <div key={`${row.player_id}-${row.rank}`} className="lb-row">
                <div className="lb-row__rank">#{row.rank}</div>
                <div className="lb-row__main">
                  <div className="lb-row__name">{row.display_name}</div>
                  <div className="lb-row__sub">
                    {t('leaderboard.totalLine', { n: fmt.format(row.games_played ?? 0), total: fmt.format(row.total_score ?? 0) })}
                  </div>
                  <div className="lb-row__sub">
                    {t('leaderboard.statsLine', { avg: Math.round(row.avg_wpm ?? 0), acc: Math.round(row.avg_accuracy ?? 0), peak: Math.round(row.max_peak_wpm ?? 0) })}
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
          <span className="lb-modal__status">{available ? t('leaderboard.supabaseActive') : t('leaderboard.localOnly')}</span>
          <KeyHint
            className="lb-modal__hint"
            items={[{ key: 'ESC', label: t('leaderboard.closeHint') }]}
          />
        </div>
      </div>
    </div>
  );
}
