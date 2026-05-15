import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../game/systems/EconomySystem.js'; // boot wallet + mirror al bridge

const root = createRoot(document.getElementById('hud-root'));
root.render(<App />);
