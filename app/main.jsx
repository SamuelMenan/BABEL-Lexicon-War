import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../game/systems/EconomySystem.js'; // boot wallet + mirror al bridge
import { initTutorialController } from '../shared/tutorialController.js';
import { KeybindService } from '../shared/keybindService.js';
import { loadProfile } from '../shared/playerProfile.js';
import { initDebugBindings } from '../game/debug/DebugBindings.js';

KeybindService.init();
const _bootProfile = loadProfile();
KeybindService.setOverrides(_bootProfile.keybindOverrides || {});
KeybindService.setDebugEnabled(!!_bootProfile.debugEnabled);
initDebugBindings();
initTutorialController();

const root = createRoot(document.getElementById('hud-root'));
root.render(<App />);
