// Comprobacion de contrasenas filtradas contra la API publica de HIBP.
//
// Por que existe: Supabase trae esta comprobacion de serie, pero solo en plan
// Pro. El proyecto esta en Free, asi que el advisor
// `auth_leaked_password_protection` no se puede resolver desde el dashboard.
// Esto lo compensa desde el cliente.
//
// Privacidad (k-anonimato): se envian SOLO los 5 primeros caracteres del SHA-1
// de la contrasena. El servidor devuelve todos los sufijos que empiezan por ese
// prefijo (cientos), y la comparacion se hace en local. Ni la contrasena ni su
// hash completo salen del navegador. Es el mismo mecanismo que usa Supabase.
//
// Limitacion, dicha claramente: al vivir en el cliente se puede evitar llamando
// directo a la API de Auth. Protege contra usuarios que eligen contrasenas
// malas, que es el problema real, no contra un atacante decidido.

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const TIMEOUT_MS = 4000;

async function sha1Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// Devuelve cuantas veces aparece la contrasena en filtraciones conocidas, o
// null si no se pudo comprobar (sin red, API caida, contexto no seguro).
//
// null NO debe bloquear el registro: preferimos dejar pasar una contrasena sin
// comprobar a romper el alta de un usuario legitimo porque HIBP este caido.
export async function countPwnedOccurrences(password) {
  if (!password || typeof password !== 'string') return null;
  // crypto.subtle solo existe en contexto seguro (https o localhost).
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;

  let hash;
  try {
    hash = await sha1Hex(password);
  } catch {
    return null;
  }

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      signal: controller.signal,
      // Respuestas de tamano uniforme: evita deducir nada por el tamano.
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return null;

    const body = await res.text();
    for (const line of body.split('\n')) {
      const [lineSuffix, count] = line.trim().split(':');
      if (lineSuffix === suffix) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;   // red, timeout o CORS: no bloqueamos
  } finally {
    clearTimeout(timer);
  }
}

export async function isPasswordPwned(password) {
  const count = await countPwnedOccurrences(password);
  return count === null ? false : count > 0;
}
