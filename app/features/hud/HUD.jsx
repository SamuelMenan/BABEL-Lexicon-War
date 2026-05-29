import React, { useEffect, useReducer, useRef, useState } from "react";
import { Bridge } from "../../shared/bridge.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { GAME_MODES, SHIP_PALETTES, SHIPS } from "../../shared/constants.js";
import { getCharacter } from "../../shared/characterData.js";
import useTranslation from "../../shared/i18n/useTranslation.js";
import { playSfx } from "../../shared/audioManager.js";

import CombatTicker from "./hud/combat/CombatTicker.jsx";
import CombatTopRight from "./hud/combat/CombatTopRight.jsx";
import CombatBottomLeft from "./hud/combat/CombatBottomLeft.jsx";
import CombatWordPanel from "./hud/combat/CombatWordPanel.jsx";
import CombatWPMSide from "./hud/combat/CombatWPMSide.jsx";
import CombatWaveSide from "./hud/combat/CombatWaveSide.jsx";
import LexiconDeck from "./hud/combat/LexiconDeck.jsx";

import RacePilotTag from "./hud/racing/RacePilotTag.jsx";
import RaceTopStatus from "./hud/racing/RaceTopStatus.jsx";
import RaceStatsTopRight from "./hud/racing/RaceStatsTopRight.jsx";
import RaceDistanceBar from "./hud/racing/RaceDistanceBar.jsx";
import RaceParagraphBlock from "./hud/racing/RaceParagraphBlock.jsx";
import RaceFlowBlock from "./hud/racing/RaceFlowBlock.jsx";
import RaceWPMSide from "./hud/racing/RaceWPMSide.jsx";
import RaceTimeSide from "./hud/racing/RaceTimeSide.jsx";
import RaceOpponentDistanceBar from "./hud/racing/RaceOpponentDistanceBar.jsx";
import RaceRunStats from "./hud/racing/RaceRunStats.jsx";
import RaceSpeedLines from "./hud/racing/RaceSpeedLines.jsx";
import OnlineOpponentHud from "./hud/racing/OnlineOpponentHud.jsx";

import Countdown from "./hud/overlays/Countdown.jsx";
import FlowFrame from "./hud/overlays/FlowFrame.jsx";
import FlowModeOverlay from "./hud/overlays/FlowModeOverlay.jsx";
import LowHpFrame from "./hud/overlays/LowHpFrame.jsx";
import PreCombatOverlay from "./hud/overlays/PreCombatOverlay.jsx";
import WaveAnnouncement from "./hud/overlays/WaveAnnouncement.jsx";

import WarningIcon from "./hud/warnings/WarningIcon.jsx";
import GrafemaToasts from "./hud/GrafemaToasts.jsx";
import WalletBadge from "./hud/WalletBadge.jsx";
import TelemetryPanel from "./hud/TelemetryPanel.jsx";
import PauseFAB from "./hud/PauseFAB.jsx";

function wordFxReducer(state, action) {
  switch (action.type) {
    case 'correct': return { animState: 'correct', showFlash: false };
    case 'wrong':   return { animState: 'wrong',   showFlash: true };
    case 'reset':   return { animState: 'idle',    showFlash: false };
    default: return state;
  }
}

export default function HUD() {
  const { t } = useTranslation();
  const [state, setState] = useState(() => Bridge.peekState());
  const [wordFx, dispatchWordFx] = useReducer(wordFxReducer, { animState: 'idle', showFlash: false });
  const { animState, showFlash } = wordFx;
  const [waveNotice, setWaveNotice] = useState(null);
  const timerRef = useRef(null);
  const waveTimerRef = useRef(null);

  useEffect(() => Bridge.onStateChange(setState), []);

  useEffect(() => {
    return EventBus.on(EventTypes.WORD_PROGRESS, ({ correct }) => {
      clearTimeout(timerRef.current);
      dispatchWordFx({ type: correct ? 'correct' : 'wrong' });
      timerRef.current = setTimeout(() => dispatchWordFx({ type: 'reset' }), correct ? 150 : 340);
      if (correct) {
        const { gameMode } = Bridge.peekState();
        if (gameMode === 'racing') {
          playSfx('word.completed');
        }
      } else {
        playSfx('word.error');
      }
    });
  }, []);

  useEffect(() => {
    const unsub = EventBus.on(EventTypes.WAVE_START, ({ waveNumber }) => {
      clearTimeout(waveTimerRef.current);
      setWaveNotice(waveNumber);
      waveTimerRef.current = setTimeout(() => setWaveNotice(null), 1450);
      playSfx('wave.alert');
    });
    return () => { clearTimeout(waveTimerRef.current); unsub(); };
  }, []);

  const {
    wpm, accuracy, hp, activeWord, wave, gameMode, flowMultiplier, selectedShip,
    currentPhrase, currentPhraseWordIndex,
    wordBuffer, globalWordIndex, wordsCompleted,
    playerPhrasesCompleted, totalPhrases,
    countdown, countdownActive, timeRemaining, deploymentPhase,
    onlineEnabled, onlineOpponentStats, onlineOpponentPilot, onlineOpponentShip,
    onlineConnection,
    distanceTraveled, targetDistance,
    opponentDistance = 0,
    combatEnemies, swarmRemnants, targetId,
    flow = 0, flowActive = false, flowCooldown = false,
    flowStreak = 0,
    warnings = {},
    preCombatActive = false, preCombatStep = null,
    preCombatValue = null, preCombatMessage = "", preCombatLevel = "yellow",
    selectedCharacter,
  } = state;

  const character = getCharacter(selectedCharacter);
  const shipEntry = SHIPS.find(s => s.id === selectedShip);
  const shipName  = shipEntry?.name || '—';
  const pilotName = (character?.name || t('hud.common.pilot')).toUpperCase();
  const pilotSub  = `${character?.codename || '—'} / ${(character?.role || t('hud.common.pilot')).toUpperCase()}`;

  const isRacing = gameMode === GAME_MODES.RACING;
  const lowHpLevel = warnings?.lowHpLevel ?? "none";

  const pal = SHIP_PALETTES[selectedShip] ?? SHIP_PALETTES.spaceshipnew;

  // hex number (0xRRGGBB) → '#rrggbb'
  const hexOf = (n) => '#' + (n & 0xFFFFFF).toString(16).padStart(6, '0');
  // hex number → 'r, g, b' string (for use inside rgba(...))
  const rgbOf = (n) => `${(n >> 16) & 0xFF}, ${(n >> 8) & 0xFF}, ${n & 0xFF}`;
  // CSS color string '#rrggbb' → 'r, g, b'
  const cssToRgb = (s) => {
    const h = s.replace('#', '');
    return `${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)}`;
  };

  const shipHudColor   = pal.hudColor;
  const shipFlameHex   = hexOf(pal.flameColor);
  const shipLaserHex   = hexOf(pal.laserColor);
  const shipRingHex    = hexOf(pal.ringColor);
  const shipInnerHex   = hexOf(pal.innerColor);
  const shipBodyHex    = hexOf(pal.bodyColor);
  const shipNorm2Hex   = hexOf(pal.normalRamp[2]);
  const shipNorm4Hex   = hexOf(pal.normalRamp[4]);
  const shipNorm6Hex   = hexOf(pal.normalRamp[6]);

  const shipHudRgb     = cssToRgb(shipHudColor);
  const shipFlameRgb   = rgbOf(pal.flameColor);
  const shipLaserRgb   = rgbOf(pal.laserColor);
  const shipRingRgb    = rgbOf(pal.ringColor);
  const shipInnerRgb   = rgbOf(pal.innerColor);
  const shipFlowRgb    = rgbOf(pal.flowRamp);

  // Ship vars always exposed (flow bar, flow frame, booster feedback)
  const shipVars = {
    '--hud-accent':      shipHudColor,
    '--ship-primary':    shipHudColor,
    '--ship-flame':      shipFlameHex,
    '--ship-laser':      shipLaserHex,
    '--ship-ring':       shipRingHex,
    '--ship-inner':      shipInnerHex,
    '--ship-body':       shipBodyHex,
    '--ship-norm2':      shipNorm2Hex,
    '--ship-norm4':      shipNorm4Hex,
    '--ship-norm6':      shipNorm6Hex,
    '--ship-hud-rgb':    shipHudRgb,
    '--ship-flame-rgb':  shipFlameRgb,
    '--ship-laser-rgb':  shipLaserRgb,
    '--ship-ring-rgb':   shipRingRgb,
    '--ship-inner-rgb':  shipInnerRgb,
    '--ship-flow-rgb':   shipFlowRgb,
  };

  // Normal mode: cyan. Flow mode: full ship palette, each role gets a distinct color.
  const hudVars = flowActive ? {
    ...shipVars,
    // ── letra/acento principal ──────────────────────
    '--col-active':           shipHudColor,
    '--col-active-rgb':       shipHudRgb,
    '--col-flow':             shipFlameHex,
    // ── estadisticas (WPM grande / precision) ───────
    '--col-stat-primary':     shipFlameHex,        // WPM — mas brillante y vibrante
    '--col-stat-secondary':   shipLaserHex,        // precision / secundario
    // ── barras de estado ────────────────────────────
    '--col-hp-fill':          shipRingHex,         // barra HP fill
    '--col-hp-glow':          `rgba(${shipRingRgb}, 0.6)`,
    // ── panel de palabra ────────────────────────────
    '--flow-border':          `rgba(${shipRingRgb}, 0.55)`,
    '--flow-panel-bg':        `rgba(${shipRingRgb}, 0.08)`,
    '--flow-word-prompt':     `rgba(${shipFlameRgb}, 0.55)`,
    '--col-meta-val':         shipNorm2Hex,        // NUCLEO / LONG / FREC valores
    '--col-transmitting':     shipNorm2Hex,        // ● TRANSMITIENDO
    // ── lexicon deck ────────────────────────────────
    '--col-deck-count':       shipLaserHex,        // numero de enemigos
    '--col-bullet':           shipFlameHex,        // ▸ flecha objetivo activo
    '--col-multiplier':       shipFlameHex,        // ×2.0 multiplicador
    // ── wave block ──────────────────────────────────
    '--col-wave-num':         shipNorm4Hex,        // "03" numero de oleada
    '--col-wave-remnants':    shipLaserHex,        // contador restos del enjambre
    // ── pilot info ──────────────────────────────────
    '--col-pilot-sub':        shipInnerHex,        // TYPO-07 / PILOTO subtitulo
    // ── ticker / misc ───────────────────────────────
    '--flow-ticker':          `rgba(${shipLaserRgb}, 0.6)`,
  } : {
    ...shipVars,
    '--col-active':           '#00ffcc',
    '--col-active-rgb':       '0, 255, 204',
    '--col-flow':             '#9966ff',
    '--col-stat-primary':     '#00ffcc',
    '--col-stat-secondary':   'rgba(255,255,255,0.5)',
    '--col-hp-fill':          '#00ffcc',
    '--col-hp-glow':          'rgba(0,255,204,0.5)',
    '--flow-border':          'rgba(0, 255, 204, 0.35)',
    '--flow-panel-bg':        'rgba(0, 255, 204, 0.05)',
    '--flow-word-prompt':     'rgba(0, 255, 204, 0.4)',
    '--col-meta-val':         '#00ffcc',
    '--col-transmitting':     '#00ffcc',
    '--col-deck-count':       '#00ffcc',
    '--col-bullet':           '#00ffcc',
    '--col-multiplier':       '#00ffcc',
    '--col-wave-num':         'rgba(255,255,255,0.85)',
    '--col-wave-remnants':    '#00ffcc',
    '--col-pilot-sub':        '#00ffcc',
    '--flow-ticker':          'rgba(0, 255, 204, 0.55)',
  };

  if (!isRacing) {
    return (
      <div className="hud" style={hudVars}>
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
            <span className="hud__pilot-name">{pilotName}</span>
            <span className="hud__pilot-sub" style={{ color: "var(--col-pilot-sub, var(--col-active))" }}>{pilotSub}</span>
            <span className="hud__pilot-ship">{t('hud.common.ship')} · {shipName.toUpperCase()}</span>
            <span className="hud__pilot-scene">{t('hud.common.sceneCombat')}</span>
          </div>
          <CombatTicker />
          <CombatTopRight wpm={wpm} accuracy={accuracy} />
          <CombatBottomLeft
            hp={hp} flow={flow} flowActive={flowActive} flowCooldown={flowCooldown}
            wave={wave} swarmRemnants={swarmRemnants} warnings={warnings}
          />
          <CombatWordPanel activeWord={activeWord} animState={animState} />
          <CombatWPMSide wpm={wpm} />
          <CombatWaveSide wave={wave} swarmRemnants={swarmRemnants} />
          <LexiconDeck combatEnemies={combatEnemies} targetId={targetId} flowMultiplier={flowMultiplier} />
          <LexiconDeck combatEnemies={combatEnemies} targetId={targetId} flowMultiplier={flowMultiplier} mirror />
          <WalletBadge placement="combat" />
          <GrafemaToasts />
          <TelemetryPanel />
          <PauseFAB />
        </div>
      </div>
    );
  }

  return (
    <div className="hud" style={hudVars}>
      {/* Race mode: only Flow frame. No edge-flash (red on miss), no LowHpFrame,
          no WarningIcon (proximity/low-HP) — those are combat-only concepts. */}
      {flowActive && <FlowFrame />}
      <div className="r-vignette" />
      {/* Fade cinematico durante landing — tapa el spawn de las naves y el
          lip del tunel; fade-out automatico al cambiar a tutorial/countdown. */}
      {deploymentPhase === 'landing' && <div className="race-landing-fade" />}
      <RaceSpeedLines flowActive={flowActive} />
      <div className="hud-safe-zone">
        <WaveAnnouncement wave={waveNotice} />
        {onlineEnabled && (
          <OnlineOpponentHud
            stats={onlineOpponentStats}
            opponentPilot={onlineOpponentPilot}
            opponentShip={onlineOpponentShip}
            connection={onlineConnection}
          />
        )}
        <Countdown countdown={countdown} countdownActive={countdownActive} />
        <RacePilotTag pilotName={pilotName} pilotSub={pilotSub} shipName={shipName} />
        <RaceTopStatus wave={wave} playerPhrasesCompleted={playerPhrasesCompleted} />
        <RaceStatsTopRight accuracy={accuracy} />
        <RaceDistanceBar
          distanceTraveled={distanceTraveled}
          targetDistance={targetDistance}
        />
        <RaceOpponentDistanceBar
          distanceOpponent={opponentDistance}
          targetDistance={targetDistance}
        />
        <RaceWPMSide wpm={wpm} />
        <RaceTimeSide timeRemaining={timeRemaining} />
        <RaceParagraphBlock
          wordBuffer={wordBuffer}
          globalWordIndex={globalWordIndex}
          activeWord={activeWord}
          animState={animState}
          wordsCompleted={wordsCompleted}
        />
        <RaceFlowBlock
          flowMultiplier={flowMultiplier}
          flowStreak={flowStreak}
          flow={flow}
          flowActive={flowActive}
        />
        <RaceRunStats playerPhrasesCompleted={playerPhrasesCompleted} wpm={wpm} />
        <WalletBadge placement="race" />
        <GrafemaToasts />
        <TelemetryPanel />
        <PauseFAB />
      </div>
    </div>
  );
}
