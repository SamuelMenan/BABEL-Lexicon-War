import React, { useEffect, useRef, useState } from "react";
import { Bridge } from "../../shared/bridge.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { GAME_MODES } from "../../shared/constants.js";

import CombatTicker from "./hud/combat/CombatTicker.jsx";
import CombatTopRight from "./hud/combat/CombatTopRight.jsx";
import CombatBottomLeft from "./hud/combat/CombatBottomLeft.jsx";
import CombatWordPanel from "./hud/combat/CombatWordPanel.jsx";
import LexiconDeck from "./hud/combat/LexiconDeck.jsx";

import RaceTicker from "./hud/racing/RaceTicker.jsx";
import RaceBottomLeft from "./hud/racing/RaceBottomLeft.jsx";
import RacePhrase from "./hud/racing/RacePhrase.jsx";
import RaceTimer from "./hud/racing/RaceTimer.jsx";

import Countdown from "./hud/overlays/Countdown.jsx";
import FlowFrame from "./hud/overlays/FlowFrame.jsx";
import FlowModeOverlay from "./hud/overlays/FlowModeOverlay.jsx";
import LowHpFrame from "./hud/overlays/LowHpFrame.jsx";
import PreCombatOverlay from "./hud/overlays/PreCombatOverlay.jsx";
import WaveAnnouncement from "./hud/overlays/WaveAnnouncement.jsx";

import WarningIcon from "./hud/warnings/WarningIcon.jsx";

export default function HUD() {
  const [state, setState] = useState(Bridge.getState());
  const [animState, setAnim] = useState("idle");
  const [showFlash, setFlash] = useState(false);
  const [waveNotice, setWaveNotice] = useState(null);
  const timerRef = useRef(null);
  const waveTimerRef = useRef(null);

  useEffect(() => Bridge.onStateChange(setState), []);

  useEffect(() => {
    return EventBus.on(EventTypes.WORD_PROGRESS, ({ correct }) => {
      clearTimeout(timerRef.current);
      if (correct) {
        setAnim("correct");
        timerRef.current = setTimeout(() => setAnim("idle"), 150);
      } else {
        setAnim("wrong");
        setFlash(true);
        timerRef.current = setTimeout(() => { setAnim("idle"); setFlash(false); }, 340);
      }
    });
  }, []);

  useEffect(() => {
    const unsub = EventBus.on(EventTypes.WAVE_START, ({ waveNumber }) => {
      clearTimeout(waveTimerRef.current);
      setWaveNotice(waveNumber);
      waveTimerRef.current = setTimeout(() => setWaveNotice(null), 1450);
    });
    return () => { clearTimeout(waveTimerRef.current); unsub(); };
  }, []);

  const {
    wpm, accuracy, hp, activeWord, wave, gameMode, flowMultiplier,
    opponentPhraseProgress, currentPhrase, currentPhraseWordIndex,
    playerPhrasesCompleted, countdown, countdownActive, timeRemaining,
    combatEnemies, swarmRemnants, targetId,
    flow = 0, flowActive = false, flowCooldown = false,
    warnings = {},
    preCombatActive = false, preCombatStep = null,
    preCombatValue = null, preCombatMessage = "", preCombatLevel = "yellow",
  } = state;

  const isRacing = gameMode === GAME_MODES.RACING;
  const lowHpLevel = warnings?.lowHpLevel ?? "none";

  if (!isRacing) {
    return (
      <div className="hud">
        {showFlash && <div className="edge-flash" />}
        {flowActive && <FlowFrame />}
        <LowHpFrame level={lowHpLevel} />
        <div className="hud-safe-zone">
          <PreCombatOverlay
            active={preCombatActive} step={preCombatStep}
            value={preCombatValue} message={preCombatMessage} level={preCombatLevel}
          />
          <WaveAnnouncement wave={waveNotice} />
          <WarningIcon warnings={warnings} flow={flow} flowActive={flowActive} flowCooldown={flowCooldown} />
          <div className="combat__top-left">
            <span className="hud__pilot-name">KAEL · VOSS</span>
            <span className="hud__pilot-sub">TYPO—07 / PILOTO</span>
          </div>
          <CombatTicker />
          <CombatTopRight wpm={wpm} accuracy={accuracy} />
          <CombatBottomLeft
            hp={hp} flow={flow} flowActive={flowActive} flowCooldown={flowCooldown}
            wave={wave} swarmRemnants={swarmRemnants} warnings={warnings}
          />
          <CombatWordPanel activeWord={activeWord} animState={animState} />
          <LexiconDeck combatEnemies={combatEnemies} targetId={targetId} flowMultiplier={flowMultiplier} />
        </div>
      </div>
    );
  }

  return (
    <div className="hud">
      {showFlash && <div className="edge-flash" />}
      <LowHpFrame level={lowHpLevel} />
      <div className="hud-safe-zone">
        <WaveAnnouncement wave={waveNotice} />
        <WarningIcon warnings={warnings} flow={flow} flowActive={flowActive} flowCooldown={flowCooldown} />
        <Countdown countdown={countdown} countdownActive={countdownActive} />
        <FlowModeOverlay flowActive={flowActive} />
        <div className="combat__top-left">
          <span className="hud__pilot-name">KAEL · VOSS</span>
          <span className="hud__pilot-sub">TYPO—07 / PILOTO</span>
        </div>
        <RaceTicker timeRemaining={timeRemaining} playerPhrasesCompleted={playerPhrasesCompleted} />
        <CombatTopRight wpm={wpm} accuracy={accuracy} />
        <RaceBottomLeft
          flowMultiplier={flowMultiplier}
          playerPhrasesCompleted={playerPhrasesCompleted || 0}
          opponentPhraseProgress={opponentPhraseProgress || 0}
        />
        <RacePhrase
          currentPhrase={currentPhrase} currentPhraseWordIndex={currentPhraseWordIndex}
          activeWord={activeWord} animState={animState}
        />
        <RaceTimer timeRemaining={timeRemaining ?? 60} />
      </div>
    </div>
  );
}
