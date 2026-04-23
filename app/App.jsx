import React, { useEffect, useState } from "react";
import { initGame, destroyGame } from "../game/main.js";
import MainMenu from "./components/MainMenu.jsx";
import HUD from "./components/HUD.jsx";
import MatchResult from "./components/MatchResult.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import { Bridge } from "../shared/bridge.js";

export default function App() {
  const [state, setState] = useState(Bridge.getState());
  useEffect(() => {
    const mountEl = document.getElementById("game-canvas");
    initGame(mountEl);
    const unsub = Bridge.onStateChange(setState);
    return () => { unsub(); destroyGame(); };
  }, []);

  const {
    isLoading, loadingProgress, loadingMode, loadingMessage,
    isRunning, gameOver, score, wpm, accuracy, wave,
    gameMode, raceVictory, peakWPM, timeElapsed,
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
    return <MatchResult score={score} wpm={wpm} accuracy={accuracy} wave={wave}
                        gameMode={gameMode} raceVictory={raceVictory} peakWPM={peakWPM} timeElapsed={timeElapsed} />;
  }

  return (
    <>
      {!isRunning && <MainMenu />}
      {isRunning  && <HUD />}
    </>
  );
}
