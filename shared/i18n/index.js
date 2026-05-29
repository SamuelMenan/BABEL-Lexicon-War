// Custom minimal i18n — sin dependencias externas. API publica:
//   t(key, vars?)          → string traducido (ES/EN segun locale activo)
//   setLocale(loc)         → cambia idioma + persiste + notifica suscriptores
//   getLocale()            → 'es' | 'en'
//   onLocaleChange(cb)     → suscribe a cambios; retorna unsub
//   getNumberFormatter()   → Intl.NumberFormat con locale activo
//
// Key lookup: dot-notation ('mainMenu.combat.label'). Missing key → retorna
// la propia key (util para detectar strings sin traducir en pantalla).
//
// Interpolacion: t('race.tick', { wpm: 42 }) reemplaza {wpm} en el template.
//
// Pluralizacion: convencion *_one / *_other:
//   "games_one": "{count} partida"
//   "games_other": "{count} partidas"
//   t('stats.games', { count: 5 }) → escoge automaticamente segun count.

import es from './locales/es.json';
import en from './locales/en.json';
import { Bridge } from '../state/bridge.js';

const STORAGE_KEY = 'babel-locale:v1';
const SUPPORTED   = ['es', 'en'];
const DEFAULT     = 'es';

const _bundles = { es, en };
let _locale = DEFAULT;
const _listeners = new Set();

function autoDetect() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch { /* ignore */ }
  // Browser hint
  const navLang = (typeof navigator !== 'undefined' && navigator.language) || '';
  if (navLang.toLowerCase().startsWith('en')) return 'en';
  return DEFAULT;
}

function persist(loc) {
  try { localStorage.setItem(STORAGE_KEY, loc); } catch { /* ignore */ }
}

function lookup(obj, key) {
  // Recorre 'a.b.c' → obj.a.b.c. Retorna undefined si falta cualquier paso.
  const parts = key.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(tmpl, vars) {
  if (!vars) return tmpl;
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function t(key, vars) {
  if (!key) return '';
  // Pluralizacion: si vars.count definido, intentar *_one (count===1) / *_other.
  if (vars && typeof vars.count === 'number') {
    const variant = vars.count === 1 ? `${key}_one` : `${key}_other`;
    const plural  = lookup(_bundles[_locale], variant) ?? lookup(_bundles[DEFAULT], variant);
    if (plural) return interpolate(plural, vars);
  }
  const tmpl = lookup(_bundles[_locale], key) ?? lookup(_bundles[DEFAULT], key);
  if (tmpl == null) return key;  // visible debug: muestra la key faltante
  return interpolate(tmpl, vars);
}

export function getLocale() { return _locale; }

export function setLocale(loc) {
  if (!SUPPORTED.includes(loc)) return;
  if (_locale === loc) return;
  _locale = loc;
  persist(loc);
  // Mirror al Bridge para que componentes que leen state re-render.
  try { Bridge.setState({ locale: loc }); } catch { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(loc); } catch { /* ignore */ } });
}

export function onLocaleChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function initLocale() {
  _locale = autoDetect();
  try { Bridge.setState({ locale: _locale }); } catch { /* ignore */ }
}

export function getNumberFormatter() {
  return new Intl.NumberFormat(_locale === 'en' ? 'en-US' : 'es-ES');
}

export const SUPPORTED_LOCALES = SUPPORTED.slice();
