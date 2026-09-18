import { getCharacter } from '@shared/data/characterData.js';
import { loadProfile } from '@shared/services/playerProfile.js';
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

// ── Sesion de partida emitida por el servidor ───────────────────────────────
// El servidor fija started_at y mode al abrirla, y despues comprueba que el
// tiempo de juego declarado quepa en el tiempo real transcurrido. Sin sesion
// no hay registro: es deliberado (modo estricto). Una partida sin red al
// arrancar se juega igual, simplemente no cuenta para el leaderboard.
let _serverSessionId = null;

export function getServerSessionId() {
  return _serverSessionId;
}

// Llamar al empezar la partida (game/main.js, en GAME_START).
export async function startSession(mode) {
  _serverSessionId = null;               // nunca reutilizar la sesion anterior
  if (!supabase) return null;

  const user = await getUser();
  if (!user) return null;                // invitado: no sube al leaderboard igualmente

  const { data, error } = await supabase.rpc('start_session', { p_mode: mode });
  if (error) {
    console.warn('[Supabase] start_session falla — la partida no se registrara', error);
    return null;
  }
  _serverSessionId = data ?? null;
  return _serverSessionId;
}

export async function saveMatchResult({
  profile = loadProfile(),
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

  // Sin sesion de servidor el RPC rechazaria de todos modos; cortamos antes
  // para no gastar una llamada ni consumir rate limit.
  const sessionId = _serverSessionId;
  if (!sessionId) {
    return { ok: false, skipped: true, reason: 'no-server-session' };
  }

  const character = getCharacter(profile?.selectedCharacter);
  const displayName = resolveDisplayName({
    user,
    profile,
    characterName: character?.name,
  });

  // Ni mode ni las marcas de tiempo viajan: los pone el servidor desde la
  // sesion. Mandarlos seria darle al cliente voz sobre cuando y a que jugo.
  const payload = {
    p_session_id:      sessionId,
    p_display_name:    displayName,
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
  _serverSessionId = null;   // una sesion, un resultado
  return { ok: true, data };
}

const LEADERBOARD_VIEWS = {
  day:   'leaderboard_daily',
  week:  'leaderboard_weekly',
  month: 'leaderboard_monthly',
};

// Fetch ranking de victorias online (modo carrera en linea, fase 3).
// View: leaderboard_online_wins. No tiene buckets temporales — all-time.
export async function fetchOnlineWinsLeaderboard({ limit = 10 } = {}) {
  if (!supabase) return { ok: false, skipped: true, rows: [] };
  const { data, error } = await supabase
    .from('leaderboard_online_wins')
    .select('*')
    .order('wins', { ascending: false })
    .order('win_rate', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { ok: true, rows: data ?? [] };
}

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
