import React, { useEffect, useState } from "react";
import { initGame, destroyGame } from "../game/main.js";
import MainMenu from "./components/MainMenu.jsx";
import HUD from "./components/HUD.jsx";
import PauseMenu from "./components/PauseMenu.jsx";
import MatchResult from "./components/MatchResult.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import HangarScreen from "./components/hangar/HangarScreen.jsx";
import { Bridge } from "../shared/bridge.js";

export default function App() {
  const [state, setState] = useState(Bridge.getState());

  useEffect(() => {
    const mountEl = document.getElementById("game-canvas");
    initGame(mountEl);
    const unsub = Bridge.onStateChange(setState);
    return () => { unsub(); destroyGame(); };
  }, []);

  // Escape toggles pause while a game session is active
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Escape') return;
      const { isRunning, isPaused, gameOver, isLoading, showShipSelection } = Bridge.getState();
      if (isLoading || gameOver || showShipSelection) return;
      if (isRunning)  Bridge.commands.pauseGame();
      if (isPaused)   Bridge.commands.resumeGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const {
    isLoading, loadingProgress, loadingMode, loadingMessage,
    isRunning, isPaused, gameOver,
    score, wpm, accuracy, wave,
    gameMode, raceVictory, peakWPM, timeElapsed,
    showShipSelection,
  } = state;

  if (isLoading) {
    return (
      <LoadingScreen
        progress={loadingProgress}
        mode={loadingMode}
        message={loadingMessage}
      />
    );
  }

  if (gameOver) {
    return (
      <MatchResult
        score={score} wpm={wpm} accuracy={accuracy} wave={wave}
        gameMode={gameMode} raceVictory={raceVictory}
        peakWPM={peakWPM} timeElapsed={timeElapsed}
      />
    );
  }

  return (
    <>
      {!isRunning && !isPaused && !showShipSelection && <MainMenu />}
      {!isRunning && !isPaused &&  showShipSelection && <HangarScreen />}
      {isRunning  && !isPaused && <HUD />}
      {isPaused   && <PauseMenu />}
    </>
  );
}
