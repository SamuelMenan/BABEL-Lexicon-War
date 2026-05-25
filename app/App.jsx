import React, { useEffect, useState } from "react";
import { initGame, destroyGame } from "../game/main.js";
import MainMenu from "./components/MainMenu.jsx";
import HUD from "./components/HUD.jsx";
import PauseMenu from "./components/PauseMenu.jsx";
import MatchResult from "./components/MatchResult.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import HangarScreen from "./components/hangar/HangarScreen.jsx";
import TutorialOverlay from "./components/tutorial/TutorialOverlay.jsx";
import ShortcutsOverlay from "./components/common/ShortcutsOverlay.jsx";
import EpilepsyWarning from "./components/EpilepsyWarning.jsx";
import PresentationMenu from "./components/PresentationMenu.jsx";
import RematchInviteModal from "./components/race/online/RematchInviteModal.jsx";
import OnlineNoticeBanner from "./components/OnlineNoticeBanner.jsx";
import { Bridge } from "../shared/bridge.js";
import { KeybindService } from "../shared/keybindService.js";
import { getSession } from "../game/services/supabase/auth.js";

export default function App() {
  const [state, setState] = useState(() => Bridge.getState());
  const [showHelp, setShowHelp] = useState(false);
  // Usuarios autenticados saltan warning + prologo. Invitados los ven cada carga.
  const [introStage, setIntroStage] = useState('checking');

  useEffect(() => {
    let mounted = true;
    getSession().then((session) => {
      if (!mounted) return;
      setIntroStage(session ? 'done' : 'warning');
    }).catch(() => {
      if (mounted) setIntroStage('warning');
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const off = KeybindService.register('global', 'SHOW_HELP', () => setShowHelp((s) => !s));
    return off;
  }, []);

  // Sync scope stack con app state (base scope = menu/hangar/gameplay).
  useEffect(() => {
    return Bridge.onStateChange((s) => {
      let base = 'menu';
      if (s.isRunning) base = 'gameplay';
      else if (s.showShipSelection) base = 'hangar';
      else if (s.onlineHangarActive) base = 'hangar';
      else if (s.isPaused) base = 'menu';
      KeybindService.setScope(base);
    });
  }, []);

  // Tutorial scope push/pop
  useEffect(() => {
    let pushed = false;
    return Bridge.onStateChange((s) => {
      if (s.tutorialActive && !pushed) { KeybindService.pushScope('tutorial'); pushed = true; }
      else if (!s.tutorialActive && pushed) { KeybindService.popScope('tutorial'); pushed = false; }
    });
  }, []);

  // Modal scope push/pop (ShortcutsOverlay)
  useEffect(() => {
    if (showHelp) { KeybindService.pushScope('modal'); return () => KeybindService.popScope('modal'); }
  }, [showHelp]);

  useEffect(() => {
    const mountEl = document.getElementById("game-canvas");
    initGame(mountEl);
    const unsub = Bridge.onStateChange(setState);
    return () => {
      unsub();
      destroyGame();
    };
  }, []);

  // Escape (CANCEL) en scope gameplay → pause/resume.
  // Tutorial scope captura Escape primero (skip). Hangar scope tiene su propio handler.
  useEffect(() => {
    const off = KeybindService.register('gameplay', 'CANCEL', () => {
      const { isRunning, isPaused, gameOver, isLoading } = Bridge.getState();
      if (isLoading || gameOver) return;
      if (isRunning) Bridge.commands.pauseGame();
      else if (isPaused) Bridge.commands.resumeGame();
    });
    return off;
  }, []);

  const {
    isLoading, loadingProgress, loadingMode, loadingMessage,
    isRunning, isPaused, gameOver,
    score, wpm, accuracy, wave,
    gameMode, raceVictory, peakWPM, timeElapsed, grafemasReward,
    wordsDestroyed, bestCombo, distanceTraveled,
    showShipSelection, tutorialActive,
    onlineEnabled, onlineOpponentStats, onlineRole,
    onlinePendingInvite, onlineNotice,
  } = state;

  if (introStage === 'checking') {
    return null;
  }

  if (introStage === 'warning') {
    return (
      <EpilepsyWarning
        onAccept={() => setIntroStage('prologue')}
      />
    );
  }

  if (introStage === 'prologue') {
    return (
      <PresentationMenu
        onComplete={() => setIntroStage('done')}
      />
    );
  }

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
      <>
        <MatchResult
          score={score} wpm={wpm} accuracy={accuracy} wave={wave}
          gameMode={gameMode} raceVictory={raceVictory}
          peakWPM={peakWPM} timeElapsed={timeElapsed}
          grafemasReward={grafemasReward}
          wordsDestroyed={wordsDestroyed} bestCombo={bestCombo}
          distanceTraveled={distanceTraveled}
          onlineEnabled={onlineEnabled}
          onlineOpponentStats={onlineOpponentStats}
          onlineRole={onlineRole}
        />
        <RematchInviteModal invite={onlinePendingInvite} />
        <OnlineNoticeBanner notice={onlineNotice} />
      </>
    );
  }

  return (
    <>
      {!isRunning && !isPaused && !showShipSelection && <MainMenu />}
      {!isRunning && showShipSelection && <HangarScreen />}
      {isRunning && <HUD />}
      {isPaused && <PauseMenu />}
      {tutorialActive && <TutorialOverlay tutorialActive={tutorialActive} />}
      <ShortcutsOverlay open={showHelp} onClose={() => setShowHelp(false)} />
      <RematchInviteModal invite={onlinePendingInvite} />
      <OnlineNoticeBanner notice={onlineNotice} />
    </>
  );
}
