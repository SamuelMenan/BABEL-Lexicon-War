import React, { useEffect, useState } from "react";
import Stats from "stats.js";
import { initGame, destroyGame } from "../game/main.js";
import MainMenu from "./components/MainMenu.jsx";
import HUD from "./components/HUD.jsx";
import PauseMenu from "./components/PauseMenu.jsx";
import MatchResult from "./components/MatchResult.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import HangarScreen from "./components/hangar/HangarScreen.jsx";
import { Bridge } from "../shared/bridge.js";
import "../game/debug/StressTest.js"; // exposes window.__babelStress

export default function App() {
  const [state, setState] = useState(Bridge.getState());

  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    let animationFrameId = 0;
    
    // Variables para guardar el historial
    let frames = 0;
    let prevTime = performance.now();
    const statsHistory = [];

    // Función para descargar los datos en formato CSV
    window.downloadGameStats = () => {
      let csvContent = "data:text/csv;charset=utf-8,Tiempo(s),FPS,Memoria(MB)\n";
      statsHistory.forEach(row => {
        csvContent += `${row.time},${row.fps},${row.memoryMB}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "babel_stats.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("📊 Historial de rendimiento descargado!");
    };

    const animate = () => {
      stats.begin();
      
      // Captura de datos cada 1 segundo (1000 ms)
      frames++;
      const time = performance.now();
      if (time >= prevTime + 1000) {
        const fps = (frames * 1000) / (time - prevTime);
        // JS Heap Memory (solo funciona en navegadores basados en Chromium)
        const memoryMB = performance.memory ? (performance.memory.usedJSHeapSize / 1048576) : 0;
        
        const currentSec = Math.round(time / 1000);
        statsHistory.push({ time: currentSec, fps: Math.round(fps), memoryMB: memoryMB.toFixed(2) });
        
        // Imprimir en la consola (F12)
        console.log(`[Rendimiento] Seg: ${currentSec} | FPS: ${Math.round(fps)} | Mem: ${memoryMB.toFixed(2)} MB`);
        
        prevTime = time;
        frames = 0;
      }

      stats.end();
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);

    const mountEl = document.getElementById("game-canvas");
    initGame(mountEl);
    const unsub = Bridge.onStateChange(setState);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      if (stats.dom.parentNode) {
        stats.dom.parentNode.removeChild(stats.dom);
      }
      unsub();
      destroyGame();
    };
  }, []);

  // Escape toggles pause while a game session is active
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Escape') return;
      const { isRunning, isPaused, gameOver, isLoading, showShipSelection } = Bridge.getState();
      if (isLoading || gameOver) return;
      if (showShipSelection) {
        e.__babelPauseToggle = true;
        if (isPaused) Bridge.commands.resumeGame();
        else Bridge.commands.pauseGame();
        return;
      }
      if (isRunning)  Bridge.commands.pauseGame();
      if (isPaused)   Bridge.commands.resumeGame();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
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
      {!isRunning && showShipSelection && <HangarScreen />}
      {isRunning && <HUD />}
      {isPaused && <PauseMenu />}
    </>
  );
}
