import React, { useEffect, useState } from 'react';
import { KeybindService } from '@shared/services/keybindService.js';
import KeyboardNavigable from '@app/ui/KeyboardNavigable.jsx';
import {
  fetchLeaderboard, fetchOnlineWinsLeaderboard, isLeaderboardSyncAvailable,
} from '@game/net/supabase/leaderboard.js';
import KeyHint from '@app/ui/KeyHint.jsx';
import Icon from '@app/ui/Icon.jsx';
import Modal from '@app/ui/Modal.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';
import { getNumberFormatter } from '@shared/i18n/index.js';

export default function LeaderboardModal({ onClose }) {
  const { t } = useTranslation();
  const fmt = getNumberFormatter();

  const [period, setPeriod] = useState('week');
  const [mode,   setMode]   = useState('combat');
  const [rows,    setRows]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [activeRow, setActiveRow] = useState(0); // 0 = period, 1 = mode

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

  useEffect(() => {
    const offUp = KeybindService.register('modal', 'NAV_UP', () => {
      if (mode === 'online-wins') {
        setActiveRow(1);
      } else {
        setActiveRow(0);
      }
      return true;
    });
    const offDown = KeybindService.register('modal', 'NAV_DOWN', () => {
      setActiveRow(1);
      return true;
    });
    const offPrev = KeybindService.register('modal', 'NAV_PREV', () => {
      if (activeRow === 0 && mode !== 'online-wins') {
        const idx = PERIODS.findIndex(p => p.value === period);
        const nextIdx = (idx - 1 + PERIODS.length) % PERIODS.length;
        setPeriod(PERIODS[nextIdx].value);
      } else if (activeRow === 1) {
        const idx = MODES.findIndex(m => m.value === mode);
        const nextIdx = (idx - 1 + MODES.length) % MODES.length;
        setMode(MODES[nextIdx].value);
      }
      return true;
    });
    const offNext = KeybindService.register('modal', 'NAV_NEXT', () => {
      if (activeRow === 0 && mode !== 'online-wins') {
        const idx = PERIODS.findIndex(p => p.value === period);
        const nextIdx = (idx + 1) % PERIODS.length;
        setPeriod(PERIODS[nextIdx].value);
      } else if (activeRow === 1) {
        const idx = MODES.findIndex(m => m.value === mode);
        const nextIdx = (idx + 1) % MODES.length;
        setMode(MODES[nextIdx].value);
      }
      return true;
    });

    return () => {
      offUp();
      offDown();
      offPrev();
      offNext();
    };
  }, [activeRow, period, mode, MODES, PERIODS]);

  const available = isLeaderboardSyncAvailable();

  return (
    <Modal className="lb-modal" panelClassName="lb-modal__panel" onClose={onClose}>
      <div className="lb-modal__header">
        <span className="lb-modal__label">◈ {t('leaderboard.label')}</span>
        <button type="button" className="lb-modal__close" onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={16} /></button>
      </div>

      <div className="lb-modal__body">
        <div className="lb-modal__sidebar">
          <div className="lb-modal__group" style={mode === 'online-wins' ? { opacity: 0.4, pointerEvents: 'none' } : null}>
            <span
              className="lb-modal__group-label"
              style={activeRow === 0 ? { color: 'var(--col-primary, #00ffcc)' } : {}}
            >
              {activeRow === 0 ? '▶ ' : ''}{t('leaderboard.period')}
            </span>
            <div className="lb-modal__chips">
              {PERIODS.map((p) => {
                const isActive = period === p.value;
                const isFocused = activeRow === 0 && isActive;
                const classes = [
                  'lb-modal__chip',
                  isActive ? 'lb-modal__chip--active' : '',
                  isFocused ? 'lb-modal__chip--focused' : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={classes}
                    onClick={() => {
                      if (mode !== 'online-wins') {
                        setPeriod(p.value);
                        setActiveRow(0);
                      }
                    }}
                    disabled={mode === 'online-wins'}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>
          <div className="lb-modal__group">
            <span
              className="lb-modal__group-label"
              style={activeRow === 1 ? { color: 'var(--col-primary, #00ffcc)' } : {}}
            >
              {activeRow === 1 ? '▶ ' : ''}{t('leaderboard.mode')}
            </span>
            <div className="lb-modal__chips">
              {MODES.map((m) => {
                const isActive = mode === m.value;
                const isFocused = activeRow === 1 && isActive;
                const classes = [
                  'lb-modal__chip',
                  isActive ? 'lb-modal__chip--active' : '',
                  isFocused ? 'lb-modal__chip--focused' : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    key={m.value}
                    type="button"
                    className={classes}
                    onClick={() => {
                      setMode(m.value);
                      setActiveRow(1);
                    }}
                  >{m.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lb-modal__content" tabIndex={0}>
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
      </div>

      <div className="lb-modal__footer">
        <span className="lb-modal__status">{available ? t('leaderboard.supabaseActive') : t('leaderboard.localOnly')}</span>
        <KeyHint
          className="lb-modal__hint"
          items={[
            { key: '↑/↓', label: t('keys.navigate') },
            { key: '←/→', label: t('keys.select') },
            { key: 'ESC', label: t('leaderboard.closeHint') }
          ]}
        />
      </div>
    </Modal>
  );
}
