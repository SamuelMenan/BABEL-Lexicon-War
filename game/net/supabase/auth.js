// Capa fina sobre supabase.auth. Devuelve { ok, error } siempre.
// Sin Supabase configurado: todas las funciones devuelven { ok:false, skipped:true }.

import { supabase } from './client.js';
import { loadProfile, saveProfile } from '@shared/services/playerProfile.js';
import { EconomySystem } from '@game/domains/economy/EconomySystem.js';
import { countPwnedOccurrences } from './passwordSafety.js';

function notReady() {
  return { ok: false, skipped: true, reason: 'supabase-not-configured' };
}

export function isAuthAvailable() {
  return Boolean(supabase);
}

// ── Player id del servidor ───────────────────────────────────────────────────
// players.id NO es auth.uid(): es un `plr_xxx` historico al que las FK de
// match_results/race_rooms apuntan. El servidor lo resuelve desde el token, y
// aqui lo cacheamos para poder comparar contra room.host_id / guest_id de forma
// sincrona desde los componentes. Sin sesion vale null y el online no arranca.
let _playerId = null;

export function getPlayerId() {
  return _playerId;
}

// JWT de la sesion, cacheado para los `fetch` de beforeunload/pagehide, donde
// no se puede await getSession(). Sin el, esas llamadas irian con la anon key
// y el servidor las rechazaria (las RPC ya exigen rol authenticated).
let _accessToken = null;

export function getAccessToken() {
  return _accessToken;
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    _accessToken = data?.session?.access_token || null;
  }).catch(() => {});
  supabase.auth.onAuthStateChange((_event, session) => {
    _accessToken = session?.access_token || null;
    if (!session) _playerId = null;
  });
}

// Aprovisiona la fila de players si hace falta y devuelve su id. Llamar tras
// resolver la sesion — MainMenu lo hace al montar y en cada cambio de auth.
export async function resolvePlayerId(displayName) {
  if (!supabase) { _playerId = null; return null; }
  const { data, error } = await supabase.rpc('ensure_player', {
    p_display_name: displayName || 'Pilot',
  });
  if (error) {
    console.warn('[auth] ensure_player falla', error);
    _playerId = null;
    return null;
  }
  _playerId = data ?? null;
  return _playerId;
}

export function clearPlayerId() {
  _playerId = null;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function getUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user || null, session);
  });
  return () => data?.subscription?.unsubscribe?.();
}

export const MIN_SIGNUP_PASSWORD_LENGTH = 10;

export async function signUp({ email, password, displayName }) {
  if (!supabase) return notReady();

  if (!password || password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
    return { ok: false, error: { message: null, code: 'password_too_short' } };
  }

  // Compensa que la comprobacion HIBP de Supabase sea de plan Pro. Si no se
  // puede comprobar (sin red, API caida) devuelve null y dejamos pasar.
  const pwnedCount = await countPwnedOccurrences(password);
  if (pwnedCount) {
    return { ok: false, error: { message: null, code: 'password_pwned' }, pwnedCount };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || null } },
  });
  if (error) return { ok: false, error };
  if (displayName) await persistDisplayName(displayName);

  // Si "Confirm email" esta OFF en Supabase, signUp devuelve session directa → listo.
  // Si esta ON, session viene null. Intentamos signIn para dev/local. Si falla
  // (porque confirmacion pendiente), devolvemos info para que UI lo muestre.
  if (!data.session) {
    const fallback = await supabase.auth.signInWithPassword({ email, password });
    if (!fallback.error && fallback.data?.session) {
      return { ok: true, user: fallback.data.user, session: fallback.data.session };
    }
  }
  return { ok: true, user: data.user, session: data.session };
}

export async function signIn({ email, password }) {
  if (!supabase) return notReady();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error };
  return { ok: true, user: data.user, session: data.session };
}

export async function signInAnonymously() {
  if (!supabase) return notReady();
  if (typeof supabase.auth.signInAnonymously !== 'function') {
    return { ok: false, error: { message: 'Anonymous sign-in no soportado por este cliente.' } };
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return { ok: false, error };
  return { ok: true, user: data.user, session: data.session };
}

export async function signInWithGoogle() {
  if (!supabase) return notReady();
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) return { ok: false, error };
  // Browser redirige a Google. La sesion se resuelve en el callback al volver.
  return { ok: true, data };
}

export async function signOut() {
  if (!supabase) return notReady();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error };
  clearPlayerId();
  // Al cerrar sesion: reset perfil local a Invitado. Borra grafemas, naves
  // compradas y stats — el invitado arranca limpio.
  try { EconomySystem.reset(); } catch (e) { console.warn('[auth] reset failed', e); }
  return { ok: true };
}

// Llamar tras sign-in / sign-up exitoso. Marca perfil como NO invitado
// y usa el display name del usuario.
export function applyAuthenticatedProfile({ user, displayName }) {
  if (!user) return;
  const name = displayName
    || user.user_metadata?.display_name
    || (user.email ? user.email.split('@')[0] : 'Pilot');
  try {
    EconomySystem.setGuestMode(false, name);
  } catch (e) { console.warn('[auth] setGuestMode failed', e); }
}

// Display name persiste en perfil local + user_metadata para mostrarlo offline.
export async function updateDisplayName(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return { ok: false, error: { message: 'Nombre vacio.' } };
  }
  await persistDisplayName(displayName);
  if (!supabase) return { ok: true, skipped: true };
  const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
  if (error) return { ok: false, error };
  return { ok: true };
}

async function persistDisplayName(displayName) {
  try {
    const p = loadProfile();
    p.displayName = displayName;
    saveProfile(p);
  } catch { /* localStorage indispuesto */ }
}

// Resuelve el display name: 1) user_metadata.display_name 2) profile.displayName
// 3) character.name 4) email local-part 5) 'Pilot'
export function resolveDisplayName({ user, profile, characterName }) {
  const fromMeta = user?.user_metadata?.display_name;
  if (fromMeta && typeof fromMeta === 'string') return fromMeta;
  if (profile?.displayName) return profile.displayName;
  if (characterName) return characterName;
  if (user?.email) return user.email.split('@')[0];
  return 'Pilot';
}
