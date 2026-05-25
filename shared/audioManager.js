import manifest from './audioManifest.json';
import { Howl, Howler } from 'howler';

let settings = { volume: 0.5, muted: false };
try {
  const saved = localStorage.getItem('audioSettings');
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) };
  }
} catch (e) { /* ignore */ }

// Master-only volume strategy: Howler.volume() controla TODO. Howls siempre volume:1.
try {
  if (typeof Howler !== 'undefined') {
    Howler.volume(settings.muted ? 0 : settings.volume);
  }
} catch (e) {}

const sfxCache = {};
let currentBgm = null;
let currentBgmKey = null;

function getSoundPaths(name) {
  const parts = name.split('.');
  let current = manifest;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return Array.isArray(current) ? current : null;
}

const MIN_GAP_BY_CATEGORY = { ui: 50, weapons: 30, explosion: 80, hud: 200, propulsion: 100, word: 30, default: 60 };

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
  if (lastPlayTimes[path] && (now - lastPlayTimes[path]) < gap) {
    return;
  }
  lastPlayTimes[path] = now;

  try {
    if (typeof Howl !== 'undefined') {
      if (!sfxCache[path]) {
        sfxCache[path] = new Howl({ src: [path], volume: 1 });
      }
      const id = sfxCache[path].play();
      if (volume !== 1) sfxCache[path].volume(volume, id);
    } else {
      const audio = new Audio(path);
      audio.volume = settings.volume * volume;
      audio.play().catch(() => {});
    }
  } catch (e) {
    try {
      const audio = new Audio(path);
      audio.volume = settings.volume * volume;
      audio.play().catch(() => {});
    } catch (err) {}
  }
}

export function playBgm(key, loop = true) {
  const paths = getSoundPaths(key);
  if (!paths || paths.length === 0) return;
  const path = paths[0];
  if (currentBgmKey === key) return;

  const fadeTime = 1000;
  const oldBgm = currentBgm;

  if (oldBgm) {
    try {
      if (typeof oldBgm.fade === 'function') {
        oldBgm.fade(oldBgm.volume(), 0, fadeTime);
        setTimeout(() => {
          try { oldBgm.stop(); } catch (e) {}
        }, fadeTime);
      } else {
        oldBgm.pause();
      }
    } catch (e) {
      try { oldBgm.pause(); } catch (err) {}
    }
  }

  currentBgmKey = key;
  try {
    if (typeof Howl !== 'undefined') {
      currentBgm = new Howl({
        src: [path],
        loop: loop,
        volume: oldBgm ? 0 : 1,
        html5: true,
      });
      currentBgm.play();
      if (oldBgm) {
        currentBgm.fade(0, 1, fadeTime);
      }
    } else {
      currentBgm = new Audio(path);
      currentBgm.loop = loop;
      currentBgm.volume = settings.volume;
      currentBgm.play().catch(() => {});
    }
  } catch (e) {
    try {
      currentBgm = new Audio(path);
      currentBgm.loop = loop;
      currentBgm.volume = settings.volume;
      currentBgm.play().catch(() => {});
    } catch (err) {}
  }
}

// Loops named (key independiente del BGM). Permite ambient loading + waiting rival
// sin pisar la musica de fondo.
const loopCache = {};
export function playLoopSfx(name, volume = 0.6) {
  const paths = getSoundPaths(name);
  if (!paths || paths.length === 0) return;
  if (loopCache[name]) return;
  try {
    if (typeof Howl !== 'undefined') {
      const h = new Howl({ src: [paths[0]], loop: true, volume, html5: true });
      h.play();
      loopCache[name] = h;
    } else {
      const a = new Audio(paths[0]);
      a.loop = true; a.volume = volume * settings.volume;
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
}

export function stopBgm() {
  if (!currentBgm) return;
  try {
    if (typeof currentBgm.stop === 'function') {
      currentBgm.stop();
    } else if (typeof currentBgm.pause === 'function') {
      currentBgm.pause();
    }
  } catch (e) {}
  currentBgm = null;
  currentBgmKey = null;
}

function _resetCachedHowlsToUnity() {
  for (const path in sfxCache) {
    try {
      const h = sfxCache[path];
      if (h && typeof h.volume === 'function') h.volume(1);
    } catch (e) {}
  }
  if (currentBgm) {
    try {
      if (typeof currentBgm.volume === 'function') currentBgm.volume(1);
      else currentBgm.volume = settings.volume;
    } catch (e) {}
  }
}

export function setVolume(value) {
  const vol = Math.max(0, Math.min(1, value));
  settings.volume = vol;
  _saveSettings();

  try {
    if (typeof Howler !== 'undefined') {
      Howler.volume(settings.muted ? 0 : vol);
    }
  } catch (e) {}

  _resetCachedHowlsToUnity();
}

export function mute(toggle) {
  settings.muted = !!toggle;
  _saveSettings();

  try {
    if (typeof Howler !== 'undefined') {
      Howler.volume(settings.muted ? 0 : settings.volume);
    }
  } catch (e) {}

  _resetCachedHowlsToUnity();
}

export function unlockAudio() {
  try {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume();
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
            if (!sfxCache[path]) {
              sfxCache[path] = new Howl({ src: [path], volume: 1, preload: true });
            }
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
  return { ...settings };
}

function _saveSettings() {
  try {
    localStorage.setItem('audioSettings', JSON.stringify(settings));
  } catch (e) {}
}
