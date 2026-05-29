import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@game/domains/economy/EconomySystem.js'; // boot wallet + mirror al bridge
import { initTutorialController } from '@shared/tutorial/tutorialController.js';
import { KeybindService } from '@shared/services/keybindService.js';
import { loadProfile } from '@shared/services/playerProfile.js';
import { initDebugBindings } from '@game/debug/DebugBindings.js';
import { setQualityTier, QUALITY } from '@shared/config/qualitySettings.js';
import { workerBridge } from '@game/domains/lexicon/workers/workerBridge.js';
import { EXECUTION_MODE } from '@shared/config/constants.js';
import { initLocale } from '@shared/i18n/index.js';
import { preloadAll, unlockAudio } from '@shared/services/audioManager.js';

// i18n boot ANTES de KeybindService — autodetecta navigator.language o usa
// localStorage. Bridge.state.locale queda seteado antes del primer render.
initLocale();

// Audio preload idle + autoplay unlock on first user gesture.
try {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => preloadAll());
  else setTimeout(() => preloadAll(), 0);
} catch { preloadAll(); }

const _unlockOnce = () => { unlockAudio(); };
window.addEventListener('pointerdown', _unlockOnce, { once: true, capture: true });
window.addEventListener('keydown', _unlockOnce, { once: true, capture: true });

// Reanuda BGM/loops al volver al tab (visibilitychange suspende AudioContext).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') unlockAudio();
});

KeybindService.init();
const _bootProfile = loadProfile();
KeybindService.setOverrides(_bootProfile.keybindOverrides || {});
KeybindService.setDebugEnabled(!!_bootProfile.debugEnabled);
initDebugBindings();
initTutorialController();

// Boot-time apply de settings v2 (quality + executionMode) — antes Settings
// solo aplicaba al abrir el modal. Ahora el runtime arranca con el valor
// guardado sin requerir interaccion del usuario.
try {
  const raw = localStorage.getItem('babel-settings:v2');
  if (raw) {
    const cfg = JSON.parse(raw);
    if (cfg?.quality)       setQualityTier(cfg.quality);
    if (cfg?.executionMode) workerBridge.setMode(cfg.executionMode);
  }
} catch { /* ignore */ }

const root = createRoot(document.getElementById('hud-root'));
root.render(<App />);
