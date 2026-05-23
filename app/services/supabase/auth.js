// Capa fina sobre supabase.auth. Devuelve { ok, error } siempre.
// Sin Supabase configurado: todas las funciones devuelven { ok:false, skipped:true }.

import { supabase } from './client.js';
import { loadProfile, saveProfile } from '../../../shared/playerProfile.js';
import { EconomySystem } from '../../../game/systems/EconomySystem.js';

function notReady() {
  return { ok: false, skipped: true, reason: 'supabase-not-configured' };
}

export function isAuthAvailable() {
  return Boolean(supabase);
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

export async function signUp({ email, password, displayName }) {
  if (!supabase) return notReady();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || null } },
  });
  if (error) return { ok: false, error };
  if (displayName) await persistDisplayName(displayName);

  // Si "Confirm email" está OFF en Supabase, signUp devuelve session directa → listo.
  // Si está ON, session viene null. Intentamos signIn para dev/local. Si falla
  // (porque confirmación pendiente), devolvemos info para que UI lo muestre.
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
  // Browser redirige a Google. La sesión se resuelve en el callback al volver.
  return { ok: true, data };
}

export async function signOut() {
  if (!supabase) return notReady();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error };
  // Al cerrar sesión: reset perfil local a Invitado. Borra grafemas, naves
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
    return { ok: false, error: { message: 'Nombre vacío.' } };
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
