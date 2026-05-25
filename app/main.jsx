import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../game/systems/EconomySystem.js'; // boot wallet + mirror al bridge
import { initTutorialController } from '../shared/tutorialController.js';
import { KeybindService } from '../shared/keybindService.js';
import { loadProfile } from '../shared/playerProfile.js';
import { initDebugBindings } from '../game/debug/DebugBindings.js';
import { setQualityTier, QUALITY } from '../shared/qualitySettings.js';
import { workerBridge } from '../game/workers/workerBridge.js';
import { EXECUTION_MODE } from '../shared/constants.js';
import { initLocale } from '../shared/i18n/index.js';

// i18n boot ANTES de KeybindService — autodetecta navigator.language o usa
// localStorage. Bridge.state.locale queda seteado antes del primer render.
initLocale();

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
