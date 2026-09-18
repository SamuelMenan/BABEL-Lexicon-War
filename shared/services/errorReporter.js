// Captura global de errores del cliente.
//
// Sin esto, en produccion estas ciego: un fallo afecta a media base de usuarios
// y no te enteras hasta que alguien escribe. Y el codigo tiene varios
// `.catch(() => {})` que se tragan errores en silencio.
//
// Diseno:
//   - Captura window.onerror y unhandledrejection. Nada mas se instala.
//   - Buffer circular en memoria con deduplicacion por huella, para que un
//     error en un bucle de render no genere mil informes identicos.
//   - Envio opcional a VITE_ERROR_ENDPOINT. Sin esa variable no sale nada de la
//     maquina: solo consola y buffer local. Asi es inocuo por defecto.
//   - window.__babelErrors expuesto para depurar en campo ("abre la consola y
//     escribe __babelErrors()").
//
// Regla de oro: este modulo NUNCA debe lanzar. Un reporter que rompe la app es
// peor que no tener reporter.

const MAX_BUFFER   = 50;   // errores distintos guardados en memoria
const MAX_SENDS    = 20;   // techo de envios por sesion, corta bucles
const ENDPOINT     = import.meta.env?.VITE_ERROR_ENDPOINT || null;

const _buffer = new Map();   // huella -> { count, first, last, entry }
let _sends = 0;
let _installed = false;

// Patrones que NUNCA deben salir en un informe. El caso real que motiva esto:
// tras el callback de OAuth, location.hash contiene el access_token.
const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,  // JWT
  /(access_token|refresh_token|apikey|api_key|password|secret)=[^&\s"']+/gi,
  /sb_(publishable|secret)_[A-Za-z0-9_-]+/g,
];

function scrub(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[redactado]');
  return out;
}

// La URL sin query ni hash: ahi es donde viajan los tokens de OAuth.
function safeUrl() {
  try {
    const u = new URL(window.location.href);
    return u.origin + u.pathname;
  } catch {
    return 'desconocida';
  }
}

function fingerprint(entry) {
  const firstFrame = (entry.stack || '').split('\n')[1] || '';
  return `${entry.type}|${entry.message}|${firstFrame.trim()}`;
}

function send(entry, count) {
  if (!ENDPOINT || _sends >= MAX_SENDS) return;
  _sends += 1;
  const payload = JSON.stringify({ ...entry, count, url: safeUrl() });
  try {
    // keepalive para que sobreviva a un unload en curso.
    fetch(ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {});
  } catch { /* el reporter jamas rompe la app */ }
}

function record(entry) {
  try {
    entry.message = scrub(entry.message);
    entry.stack   = scrub(entry.stack);

    const key = fingerprint(entry);
    const now = Date.now();
    const seen = _buffer.get(key);

    if (seen) {
      seen.count += 1;
      seen.last = now;
      // Solo se reenvia en potencias de 10: 1, 10, 100... Un error en bucle
      // deja rastro de su frecuencia sin inundar el destino.
      if (Number.isInteger(Math.log10(seen.count))) send(seen.entry, seen.count);
      return;
    }

    if (_buffer.size >= MAX_BUFFER) {
      _buffer.delete(_buffer.keys().next().value);   // descarta el mas antiguo
    }
    _buffer.set(key, { count: 1, first: now, last: now, entry });
    console.error('[error]', entry.type, entry.message, entry.stack || '');
    send(entry, 1);
  } catch { /* ni aqui */ }
}

function fromError(err) {
  if (err instanceof Error) {
    return { message: err.message || String(err), stack: err.stack || null };
  }
  if (err && typeof err === 'object') {
    // Los errores de Supabase son objetos planos { message, code, details }.
    return {
      message: err.message || err.error_description || JSON.stringify(err).slice(0, 500),
      stack: err.stack || null,
    };
  }
  return { message: String(err), stack: null };
}

// Para llamar a mano desde un catch que hoy se traga el error.
export function reportError(err, context = null) {
  const base = fromError(err);
  record({
    type: 'manual',
    message: base.message,
    stack: base.stack,
    context: context ? scrub(String(context)) : null,
    at: new Date().toISOString(),
  });
}

export function getErrorBuffer() {
  return Array.from(_buffer.values())
    .sort((a, b) => b.last - a.last)
    .map(({ count, first, last, entry }) => ({
      ...entry,
      count,
      firstSeen: new Date(first).toISOString(),
      lastSeen:  new Date(last).toISOString(),
    }));
}

export function initErrorReporting() {
  if (_installed || typeof window === 'undefined') return;
  _installed = true;

  window.addEventListener('error', (e) => {
    // Los fallos de carga de recursos (img, script) llegan aqui sin `error`.
    if (!e.error && e.target && e.target !== window) {
      record({
        type: 'resource',
        message: `No se pudo cargar: ${e.target.src || e.target.href || 'recurso'}`,
        stack: null,
        at: new Date().toISOString(),
      });
      return;
    }
    const base = fromError(e.error || e.message);
    record({
      type: 'error',
      message: base.message,
      stack: base.stack,
      where: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : null,
      at: new Date().toISOString(),
    });
  }, true);   // capture: true para ver tambien los errores de recursos

  window.addEventListener('unhandledrejection', (e) => {
    const base = fromError(e.reason);
    record({
      type: 'unhandledrejection',
      message: base.message,
      stack: base.stack,
      at: new Date().toISOString(),
    });
  });

  // Acceso desde la consola del navegador para depurar en campo.
  window.__babelErrors = getErrorBuffer;

  if (!ENDPOINT) {
    console.info('[errorReporter] activo (solo local). Define VITE_ERROR_ENDPOINT para enviar.');
  }
}

// Se instala al importarse, no al llamarlo. Los `import` de ES modules estan
// hoisted: TODOS se ejecutan antes que cualquier sentencia del modulo que los
// importa. Una llamada explicita en main.jsx correria despues de que hayan
// corrido los efectos secundarios de los demas imports, que es justo cuando
// mas probable es que algo falle en el arranque.
//
// Por eso este modulo debe ser el PRIMER import de app/main.jsx.
initErrorReporting();
