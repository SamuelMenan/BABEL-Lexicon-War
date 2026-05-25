import manifest from './audioManifest.json';
import { Howl, Howler } from 'howler';

let settings = { sfxVolume: 0.6, bgmVolume: 0.4, muted: false };
try {
  const saved = localStorage.getItem('audioSettings');
  if (saved) {
    const parsed = JSON.parse(saved);
    // Migracion v1 (volume unico) → v2 (sfxVolume + bgmVolume).
    if (parsed && parsed.volume !== undefined && parsed.sfxVolume === undefined) {
      settings.sfxVolume = parsed.volume;
      settings.bgmVolume = parsed.volume;
      if (parsed.muted !== undefined) settings.muted = !!parsed.muted;
    } else {
      settings = { ...settings, ...parsed };
    }
  }
} catch (e) {}

// Howler master = mute toggle. Volumenes reales por Howl (sfx vs bgm).
try {
  if (typeof Howler !== 'undefined') Howler.volume(settings.muted ? 0 : 1);
} catch (e) {}

const sfxCache = {};
const bgmCache = {};
let currentBgm = null;
let currentBgmKey = null;
let pendingFadeOuts = [];
const loopCache = {};
const loopBaseVol = {}; // name → volume base pasada por caller

function getSoundPaths(name) {
  const parts = name.split('.');
  let current = manifest;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) current = current[part];
    else return null;
  }
  return Array.isArray(current) ? current : null;
}

const MIN_GAP_BY_CATEGORY = { ui: 50, weapons: 30, explosion: 80, hud: 200, propulsion: 100, word: 30, race: 50, raceengine: 80, blackhole: 200, playerhit: 100, hangarcamera: 200, hangarboost: 200, hangarlaser: 200, menuback: 80, shiparrival: 300, default: 60 };
function gapFor(name) {
  const cat = name.split('.')[0];
  return MIN_GAP_BY_CATEGORY[cat] ?? MIN_GAP_BY_CATEGORY.default;
}

export function playSfx(name, volume = 1) {
  const paths = getSoundPaths(name);
  if (!paths || paths.length === 0) return;
  _playSound(paths[0], gapFor(name), volume);
}

export function playRandomSfx(name, volume = 1) {
  const paths = getSoundPaths(name);
  if (!paths || paths.length === 0) return;
  const path = paths[Math.floor(Math.random() * paths.length)];
  _playSound(path, gapFor(name), volume);
}

const lastPlayTimes = {};

function _playSound(path, gap = 60, volume = 1) {
  if (settings.muted) return;
  const now = Date.now();
  if (lastPlayTimes[path] && (now - lastPlayTimes[path]) < gap) return;
  lastPlayTimes[path] = now;

  const finalVol = settings.sfxVolume * volume;
  try {
    if (typeof Howl !== 'undefined') {
      if (!sfxCache[path]) sfxCache[path] = new Howl({ src: [path], volume: 1 });
      const id = sfxCache[path].play();
      sfxCache[path].volume(finalVol, id);
    } else {
      const audio = new Audio(path);
      audio.volume = finalVol;
      audio.play().catch(() => {});
    }
  } catch (e) {
    try {
      const audio = new Audio(path);
      audio.volume = finalVol;
      audio.play().catch(() => {});
    } catch (err) {}
  }
}

export function playBgm(key, optsOrLoop) {
  let loop = true;
  let fadeMs = 1200;
  if (typeof optsOrLoop === 'boolean') loop = optsOrLoop;
  else if (optsOrLoop && typeof optsOrLoop === 'object') {
    if (optsOrLoop.loop !== undefined) loop = !!optsOrLoop.loop;
    if (optsOrLoop.fadeMs !== undefined) fadeMs = optsOrLoop.fadeMs;
  }
  const paths = getSoundPaths(key);
  if (!paths || paths.length === 0) return;
  const path = paths[0];
  if (currentBgmKey === key && currentBgm) return;

  pendingFadeOuts.forEach(({ timeout }) => clearTimeout(timeout));
  pendingFadeOuts = [];

  const oldBgm = currentBgm;
  if (oldBgm) {
    try {
      if (typeof oldBgm.fade === 'function') {
        const curVol = oldBgm.volume();
        oldBgm.fade(curVol, 0, fadeMs);
        const t = setTimeout(() => { try { oldBgm.stop(); } catch (e) {} }, fadeMs);
        pendingFadeOuts.push({ howl: oldBgm, timeout: t });
      } else {
        oldBgm.pause();
      }
    } catch (e) {
      try { oldBgm.pause(); } catch (err) {}
    }
  }

  currentBgmKey = key;
  const target = settings.bgmVolume;
  try {
    if (typeof Howl !== 'undefined') {
      let h = bgmCache[key];
      if (!h) {
        h = new Howl({ src: [path], loop, volume: 0, html5: true });
        bgmCache[key] = h;
      } else {
        try { h.loop(loop); } catch (e) {}
        try { h.volume(0); } catch (e) {}
      }
      currentBgm = h;
      if (!h.playing()) h.play();
      h.fade(0, target, fadeMs);
    } else {
      currentBgm = new Audio(path);
      currentBgm.loop = loop;
      currentBgm.volume = target;
      currentBgm.play().catch(() => {});
    }
  } catch (e) {
    try {
      currentBgm = new Audio(path);
      currentBgm.loop = loop;
      currentBgm.volume = target;
      currentBgm.play().catch(() => {});
    } catch (err) {}
  }
}

export function crossfadeBgm(key, fadeMs = 1200) {
  return playBgm(key, { loop: true, fadeMs });
}

export function getCurrentBgmKey() { return currentBgmKey; }

export function playLoopSfx(name, volume = 0.6) {
  const paths = getSoundPaths(name);
  if (!paths || paths.length === 0) return;
  if (loopCache[name]) return;
  loopBaseVol[name] = volume;
  const finalVol = settings.sfxVolume * volume;
  try {
    if (typeof Howl !== 'undefined') {
      const h = new Howl({ src: [paths[0]], loop: true, volume: finalVol, html5: true });
      h.play();
      loopCache[name] = h;
    } else {
      const a = new Audio(paths[0]);
      a.loop = true; a.volume = finalVol;
      a.play().catch(() => {});
      loopCache[name] = a;
    }
  } catch (e) {}
}

export function stopLoopSfx(name) {
  const h = loopCache[name];
  if (!h) return;
  try {
    if (typeof h.stop === 'function') h.stop();
    else if (typeof h.pause === 'function') h.pause();
  } catch (e) {}
  delete loopCache[name];
  delete loopBaseVol[name];
}

export function stopBgm() {
  if (!currentBgm) return;
  try {
    if (typeof currentBgm.stop === 'function') currentBgm.stop();
    else if (typeof currentBgm.pause === 'function') currentBgm.pause();
  } catch (e) {}
  currentBgm = null;
  currentBgmKey = null;
}

function _applyBgmVolume() {
  if (!currentBgm) return;
  try {
    if (typeof currentBgm.volume === 'function') currentBgm.volume(settings.bgmVolume);
    else currentBgm.volume = settings.bgmVolume;
  } catch (e) {}
}

function _applyLoopVolumes() {
  for (const name in loopCache) {
    try {
      const h = loopCache[name];
      const base = loopBaseVol[name] ?? 0.6;
      const v = settings.sfxVolume * base;
      if (typeof h.volume === 'function') h.volume(v);
      else h.volume = v;
    } catch (e) {}
  }
}

export function setSfxVolume(value) {
  settings.sfxVolume = Math.max(0, Math.min(1, value));
  _saveSettings();
  _applyLoopVolumes();
}

export function setBgmVolume(value) {
  settings.bgmVolume = Math.max(0, Math.min(1, value));
  _saveSettings();
  _applyBgmVolume();
}

// Compat: setVolume aplica a ambos canales.
export function setVolume(value) {
  setSfxVolume(value);
  setBgmVolume(value);
}

export function mute(toggle) {
  settings.muted = !!toggle;
  _saveSettings();
  try {
    if (typeof Howler !== 'undefined') Howler.volume(settings.muted ? 0 : 1);
  } catch (e) {}
  if (settings.muted) {
    for (const name in loopCache) {
      try { loopCache[name].pause?.(); } catch (e) {}
    }
    try { currentBgm?.pause?.(); } catch (e) {}
  } else {
    for (const name in loopCache) {
      try { if (!loopCache[name].playing?.()) loopCache[name].play?.(); } catch (e) {}
    }
    try { if (currentBgm && !currentBgm.playing?.()) currentBgm.play?.(); } catch (e) {}
  }
}

export function unlockAudio() {
  try {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
  } catch (e) {}
  try {
    if (currentBgm && typeof currentBgm.playing === 'function' && !currentBgm.playing()) currentBgm.play();
  } catch (e) {}
  try {
    for (const k in loopCache) {
      const h = loopCache[k];
      if (h && typeof h.playing === 'function' && !h.playing()) h.play();
    }
  } catch (e) {}
}

export function preloadAll() {
  try {
    if (typeof Howl === 'undefined') return;
    const loadCategory = (obj) => {
      for (const k in obj) {
        if (Array.isArray(obj[k])) {
          obj[k].forEach(path => {
            if (!sfxCache[path]) sfxCache[path] = new Howl({ src: [path], volume: 1, preload: true });
          });
        } else if (typeof obj[k] === 'object') {
          loadCategory(obj[k]);
        }
      }
    };
    loadCategory(manifest);
  } catch (e) {}
}

export function getAudioSettings() {
  // Compat: expone `volume` como promedio (consumidores antiguos).
  return { ...settings, volume: (settings.sfxVolume + settings.bgmVolume) / 2 };
}

function _saveSettings() {
  try { localStorage.setItem('audioSettings', JSON.stringify(settings)); } catch (e) {}
}
