import { getCharacter } from '../../../shared/characterData.js';
import { loadProfile } from '../../../shared/playerProfile.js';
import { supabase } from './client.js';
import { getUser, resolveDisplayName } from './auth.js';

function toInteger(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}

function toNumber(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

export function isLeaderboardSyncAvailable() {
  return Boolean(supabase);
}

export async function saveMatchResult({
  profile = loadProfile(),
  sessionId,
  mode,
  startedAt,
  finishedAt,
  score,
  wpm,
  accuracy,
  wave,
  raceVictory,
  peakWPM,
  timeElapsed,
  grafemasReward,
  wordsDestroyed,
  bestCombo,
}) {
  if (!supabase) {
    return { ok: false, skipped: true, reason: 'supabase-not-configured' };
  }

  const user = await getUser();
  // Invitado (no autenticado) NO se sube al leaderboard.
  if (!user || profile?.isGuest) {
    return { ok: false, skipped: true, reason: 'guest' };
  }

  const character = getCharacter(profile?.selectedCharacter);
  const displayName = resolveDisplayName({
    user,
    profile,
    characterName: character?.name,
  });

  const payload = {
    p_player_id:       profile.playerId,
    p_auth_user_id:    user?.id ?? null,
    p_display_name:    displayName,
    p_session_id:      sessionId,
    p_mode:            mode || 'combat',
    p_started_at:      startedAt || null,
    p_finished_at:     finishedAt || new Date().toISOString(),
    p_score:           toInteger(score),
    p_wpm:             toInteger(wpm),
    p_accuracy:        toNumber(accuracy),
    p_wave:            toInteger(wave),
    p_race_victory:    raceVictory == null ? null : Boolean(raceVictory),
    p_peak_wpm:        toInteger(peakWPM),
    p_time_elapsed:    toInteger(timeElapsed),
    p_grafemas_reward: toInteger(grafemasReward),
    p_words_destroyed: toInteger(wordsDestroyed),
    p_best_combo:      toInteger(bestCombo),
  };

  const { data, error } = await supabase.rpc('record_match_result', payload);
  if (error) throw error;
  return { ok: true, data };
}

const LEADERBOARD_VIEWS = {
  day:   'leaderboard_daily',
  week:  'leaderboard_weekly',
  month: 'leaderboard_monthly',
};

export async function fetchLeaderboard({ period = 'day', mode, limit = 10 } = {}) {
  if (!supabase) {
    return { ok: false, skipped: true, rows: [] };
  }

  const viewName = LEADERBOARD_VIEWS[period] || LEADERBOARD_VIEWS.day;
  let query = supabase
    .from(viewName)
    .select('*')
    .order('rank', { ascending: true })
    .limit(limit);

  if (mode) {
    query = query.eq('mode', mode);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { ok: true, rows: data ?? [] };
}
