import React, { useEffect } from 'react';
import { initGame, destroyGame } from '../game/main.js';
import MainMenu from './components/MainMenu.jsx';
import HUD from './components/HUD.jsx';
import { Bridge } from '../shared/bridge.js';

export default function App() {
  const [isRunning, setIsRunning] = React.useState(false);

  useEffect(() => {
    const mountEl = document.getElementById('game-canvas');
    initGame(mountEl);

    const unsub = Bridge.onStateChange((state) => {
      setIsRunning(state.isRunning);
    });

    return () => {
      unsub();
      destroyGame();
    };
  }, []);

  return (
    <>
      {!isRunning && <MainMenu />}
      {isRunning  && <HUD />}
    </>
  );
}
