import React, { useEffect, useState, useRef } from "react";
import { Bridge } from "../../shared/bridge.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { GAME_MODES, WARN_PROXIMITY_YELLOW_M, WARN_PROXIMITY_RED_M } from "../../shared/constants.js";

// ─── Shared ─────────────────────────────────────────────────────────────────

function ActiveWord({ activeWord, animState }) {
  const [poppedIdx, setPoppedIdx] = useState(-1);
  const [wrongIdx, setWrongIdx] = useState(-1);
  useEffect(() => {
    const unsub = EventBus.on(EventTypes.WORD_PROGRESS, ({ typed, correct, errorAt }) => {
      if (correct && typed.length > 0) {
        const idx = typed.length - 1;
        setPoppedIdx(idx);
        setTimeout(() => setPoppedIdx(-1), 200);
      } else if (!correct && typeof errorAt === "number") {
        setWrongIdx(errorAt);
        setTimeout(() => setWrongIdx(-1), 220);
      }
    });
    return unsub;
  }, []);
  if (!activeWord) {
    return (<div style={S.wordZone}><span style={S.wordIdle}>_ _ _ _ _ _ _</span></div>);
  }
  const { word, typed } = activeWord;
  const progress = typed.length / word.length;
  return (
    <div style={S.wordZone}>
      <div className={"word-area-" + animState} style={S.wordLetters}>
        {word.split("").map((ch, i) => {
          const done = i < typed.length; const current = i === typed.length; const popped = i === poppedIdx;
          const wrong = i === wrongIdx;
          return (
            <span key={word+"-"+i} className={wrong ? "letter-wrong" : popped ? "letter-popped" : ""} style={{ ...S.letter,
              color: done ? "var(--col-active)" : current ? "var(--col-pending)" : "var(--col-ghost-letter)",
              textShadow: done ? "0 0 14px var(--col-active)" : "none" }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div style={S.progressTrack}>
        <div style={{ ...S.progressFill, width: (progress*100)+"%",
          background: animState==="wrong" ? "#ff2244" : "var(--col-active)",
          boxShadow: animState==="wrong" ? "0 0 10px #ff2244" : "0 0 8px var(--col-active)" }} />
      </div>
    </div>
  );
}

// ─── Racing ─────────────────────────────────────────────────────────────────

function RaceTicker({ timeRemaining, playerPhrasesCompleted }) {
  const s = Math.max(0, Math.round(timeRemaining ?? 60));
  const msg = `◂  PROTOCOLO · SPRINT · ACTIVO  ▸  SECUENCIAS · ${String(playerPhrasesCompleted || 0).padStart(2,"0")} · TRANSMITIDAS  ▸  TIEMPO · ${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")} · RESTANTE  ▸  SISTEMA · FLUJO · ESTABLE  ▸  `;
  return (
    <div style={S.ticker}>
      <div style={S.tickerInner}>
        <span style={S.tickerText}>{msg}{msg}</span>
      </div>
    </div>
  );
}

function RaceBottomLeft({ flowMultiplier, playerPhrasesCompleted, opponentPhraseProgress }) {
  const oppDone = Math.floor(opponentPhraseProgress);
  const winning = playerPhrasesCompleted > oppDone;
  const flowPct = Math.min(100, ((flowMultiplier - 1.0) / 1.0) * 100);
  return (
    <div style={S.combatBottomLeft}>
      <div style={S.raceStatPanel}>
        <span style={S.raceStatPanelLabel}>ESTADO · SPRINT</span>
        <div style={S.raceStatRow}>
          <span style={S.raceStatRowLabel}>SECUENCIAS</span>
          <span style={{ ...S.raceStatRowVal, color:"var(--col-active)" }}>{String(playerPhrasesCompleted).padStart(2,"0")}</span>
        </div>
        <div style={S.raceStatRow}>
          <span style={S.raceStatRowLabel}>OPONENTE</span>
          <span style={{ ...S.raceStatRowVal, color: winning ? "rgba(255,255,255,0.4)" : "#ff4466" }}>{String(oppDone).padStart(2,"0")}</span>
        </div>
        <div style={{ ...S.raceStatRow, marginTop:"0.2rem" }}>
          <span style={{ ...S.raceStatRowLabel, color: winning ? "#00ff88" : "#ff4466", letterSpacing:"0.15em" }}>
            {winning ? "▲ DELANTE" : "▼ DETRAS"}
          </span>
        </div>
      </div>
      {flowMultiplier > 1.0 && (
        <div style={S.raceFlowBlock}>
          <span style={S.raceFlowLabel}>MULTIPLICADOR DE FLUJO</span>
          <span style={{ ...S.raceFlowVal,
            color: flowMultiplier>=2 ? "#00ff88" : "var(--col-active)",
            textShadow: "0 0 16px "+(flowMultiplier>=2?"#00ff88":"var(--col-active)") }}>
            ×{flowMultiplier.toFixed(1)}
          </span>
          <div style={S.raceFlowTrack}>
            <div style={{ ...S.raceFlowFill, width: flowPct+"%",
              background: flowMultiplier>=2 ? "#00ff88" : "var(--col-active)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

function RacePhrase({ currentPhrase, currentPhraseWordIndex, activeWord, animState }) {
  if (!currentPhrase) return null;
  const typed = activeWord?.typed || "";
  return (
    <div style={S.phraseZone}>
      <div className={"word-area-" + animState} style={S.phraseWords}>
        {currentPhrase.map((word, wi) => {
          if (wi < currentPhraseWordIndex) return <span key={wi} style={S.phraseDone}>{word}</span>;
          if (wi === currentPhraseWordIndex) return (
            <span key={wi} style={S.phraseActive}>
              {word.split("").map((ch, ci) => (
                <span key={ci} style={{
                  color: ci<typed.length ? "var(--col-active)" : ci===typed.length ? "var(--col-pending)" : "var(--col-ghost-letter)",
                  textShadow: ci<typed.length ? "0 0 12px var(--col-active)" : "none" }}>
                  {ch}
                </span>
              ))}
            </span>
          );
          return <span key={wi} style={S.phraseUpcoming}>{word}</span>;
        })}
      </div>
    </div>
  );
}

function RaceTimer({ timeRemaining }) {
  const s = Math.max(0, Math.round(timeRemaining));
  const timePct = Math.min(100, ((60-s)/60)*100);
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss2 = String(s%60).padStart(2,"0");
  const col = s<=10 ? "#ff4466" : s<=20 ? "#ffcc00" : "var(--col-active)";
  return (
    <div style={S.raceTimerPanel}>
      <span style={S.raceTimerLabel}>TIEMPO · RESTANTE</span>
      <span style={{ ...S.raceTimerNum, color: col,
        textShadow: "0 0 20px "+col,
        animation: s<=10 ? "blink 0.5s step-end infinite" : "none" }}>
        {mm}:{ss2}
      </span>
      <div style={S.raceTimerTrack}>
        <div style={{ ...S.raceTimerFill, width: (100-timePct)+"%",
          background: s<=10 ? "#ff4466" : s<=20 ? "#ffcc00" : "linear-gradient(90deg,#00ffcc,#00ff88)" }} />
      </div>
    </div>
  );
}


function Countdown({ countdown, countdownActive }) {
  const [showGo, setShowGo] = useState(false);
  const prevActive = useRef(true);
  useEffect(() => {
    if (prevActive.current && !countdownActive) { setShowGo(true); setTimeout(() => setShowGo(false), 900); }
    prevActive.current = countdownActive;
  }, [countdownActive]);
  if (!countdownActive && !showGo) return null;
  const label = showGo ? "YA!" : countdown > 0 ? String(countdown) : "";
  const col = showGo ? "#00ff88" : "rgba(255,255,255,0.9)";
  return (
    <div style={S.countdownOverlay}>
      <span style={{ ...S.countdownNum, color: col, textShadow: "0 0 60px "+col+", 0 0 120px "+col }}>
        {label}
      </span>
    </div>
  );
}

// ─── Combat ─────────────────────────────────────────────────────────────────

function CombatTicker() {
  const msg = "◂  FIRMA DEL ENJAMBRE · DETECTADA  ▸  LEXICO · HOSTIL  ▸  PROTOCOLO LEXICO · EN CURSO  ▸  PROGRAMA TYPO · ACTIVO  ▸  ";
  return (
    <div style={S.ticker}>
      <div style={S.tickerInner}>
        <span style={S.tickerText}>{msg}{msg}</span>
      </div>
    </div>
  );
}

function CombatTopRight({ wpm, accuracy }) {
  const wpmCol = wpm>=60 ? "var(--col-active)" : wpm>=30 ? "#ffcc00" : wpm>0 ? "#ff6644" : "rgba(255,255,255,0.35)";
  return (
    <div style={S.combatTopRight}>
      <div style={S.combatStatBlock}>
        <span style={{ ...S.combatBigNum, color: wpmCol, textShadow: wpm>=60 ? "0 0 20px "+wpmCol : "none" }}>{wpm}</span>
        <span style={S.combatStatLabel}>PPM</span>
      </div>
      <div style={{ ...S.combatStatBlock, alignItems:"flex-end" }}>
        <div style={S.combatAccRow}>
          <span style={S.combatBigNum2}>{accuracy}</span>
          <span style={S.combatAccPct}>%</span>
        </div>
        <span style={S.combatStatLabel}>PRECISION</span>
      </div>
    </div>
  );
}

function getProximityLevel(distance) {
  if (!Number.isFinite(distance)) return "none";
  if (distance <= WARN_PROXIMITY_RED_M) return "red";
  if (distance <= WARN_PROXIMITY_YELLOW_M) return "yellow";
  return "none";
}

function WarningTriangle({ level, size = "1em" }) {
  if (level === "none") return null;
  return <span className={level === "red" ? "deck-warning-red" : "deck-warning-yellow"} style={{ fontSize: size }}>⚠</span>;
}

function WarningBox({ level, label, detail }) {
  if (level === 'none') return null;

  return (
    <div className={`warning-icon warning-icon-${level}`}>
      <WarningTriangle level={level} size="1.1rem" />
      <span className="warning-icon-text">
        <span className="warning-icon-title">{label}</span>
        {detail ? <span className="warning-icon-detail">{detail}</span> : null}
      </span>
    </div>
  );
}

function WarningIcon({ warnings }) {
  const proximityLevel = warnings?.proximityLevel ?? 'none';
  const lowHpLevel = warnings?.lowHpLevel ?? 'none';
  const distance = warnings?.closestEnemyDistance;

  const boxes = [];
  if (proximityLevel !== 'none') {
    boxes.push({
      level: proximityLevel,
      label: proximityLevel === 'red' ? 'OBJETO CERCANO' : 'OBJETO CERCA',
      detail: `${distance ?? '--'}M`,
    });
  }

  if (lowHpLevel !== 'none') {
    boxes.push({
      level: lowHpLevel,
      label: lowHpLevel === 'red' ? 'VIDA BAJA' : 'VIDA MEDIA',
      detail: null,
    });
  }

  if (boxes.length === 0) return null;

  return (
    <div className="warning-stack">
      {boxes.map((box) => (
        <WarningBox key={`${box.label}-${box.detail ?? 'x'}`} level={box.level} label={box.label} detail={box.detail} />
      ))}
    </div>
  );
}

function LowHpFrame({ level }) {
  if (level === 'none') return null;

  return (
    <div className={`low-hp-frame low-hp-frame-${level}`}>
      <div className="low-hp-frame-corner low-hp-frame-corner-tl" />
      <div className="low-hp-frame-corner low-hp-frame-corner-tr" />
      <div className="low-hp-frame-corner low-hp-frame-corner-bl" />
      <div className="low-hp-frame-corner low-hp-frame-corner-br" />
      <div className="low-hp-frame-scan low-hp-frame-scan-top" />
      <div className="low-hp-frame-scan low-hp-frame-scan-bottom" />
      <div className="low-hp-frame-caption">HULL · {level === 'red' ? 'CRITICAL' : 'LOW'}</div>
    </div>
  );
}

function PreCombatOverlay({ active, step, value, message, level }) {
  if (!active) return null;
  const engage = step === 'engage';
  return (
    <div className={`precombat-overlay precombat-overlay-${level}`}>
      <div className={`precombat-frame precombat-frame-${level}`}>
        <span className="precombat-phase">{engage ? 'ENGAGE' : 'PREPARE'}</span>
        <span className={`precombat-value ${engage ? 'precombat-value-engage' : ''}`}>{value ?? '...'}</span>
        <span className="precombat-message">{message}</span>
      </div>
      <div className="precombat-scanline" />
      {engage && <div className="precombat-edge-flash" />}
    </div>
  );
}

function StatusBar({ label, value, max=100, danger=false, forceColor, flash=false }) {
  const pct = Math.max(0, Math.min(100, (value/max)*100));
  const col = forceColor ?? (danger && pct<=35 ? "#ff4466" : "var(--col-active)");
  return (
    <div className={flash ? "status-bar-flash" : ""} style={S.statusBarRow}>
      <span style={S.statusBarLabel}>{label}</span>
      <div style={S.statusBarTrack}>
        <div style={{ ...S.statusBarFill, width: pct+"%", background: col, boxShadow: "0 0 5px "+col }} />
      </div>
      <span style={{ ...S.statusBarValue, color: col }}>{String(Math.round(value)).padStart(3,"0")}</span>
    </div>
  );
}

function CombatBottomLeft({ hp, lexHeat, lexHeatMax = 100, isOverheated, wave, swarmRemnants, warnings }) {
  const lexHeatPct = (lexHeat / lexHeatMax) * 100;
  const lexHeatColor = isOverheated ? "#ff4466"
    : lexHeatPct >= 85 ? "#ff4466"
    : lexHeatPct >= 60 ? "#ffcc00"
    : "var(--col-active)";
  const lowHpLevel = warnings?.lowHpLevel ?? 'none';
  const hpForceColor = lowHpLevel === 'red'
    ? '#ff4466'
    : lowHpLevel === 'yellow'
      ? '#ffcc00'
      : undefined;
  return (
    <div style={S.combatBottomLeft}>
      <StatusBar label="CASCO"      value={hp}      danger forceColor={hpForceColor} flash={lowHpLevel === 'red'} />
      <StatusBar label="CALOR·LEX"  value={lexHeat} max={lexHeatMax} forceColor={lexHeatColor} />
      <div style={S.waveBlock}>
        <span style={S.waveLabel}>OLEADA · LEXICA</span>
        <span style={S.waveNum}>{String(wave || 0).padStart(2,"0")}</span>
        <span style={S.swarmRem}>RESTOS DEL ENJAMBRE <span style={{ color:"var(--col-active)" }}>{swarmRemnants}</span></span>
      </div>
    </div>
  );
}

function wordHexCore(word) {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) & 0xFFFF;
  return "0X" + h.toString(16).toUpperCase().padStart(4,"0").slice(0,2) + "·" + h.toString(16).toUpperCase().padStart(4,"0").slice(2);
}

const WORD_TYPE_MAP = { escritor:"NOMBRE·NUCLEO", piloto:"NOMBRE·NUCLEO", palabra:"NOMBRE·NUCLEO", silencio:"NOMBRE·NUCLEO",
  enjambre:"NOMBRE·NUCLEO", babel:"PROPIO·NUCLEO", kael:"PROPIO·NUCLEO", lyra:"PROPIO·NUCLEO", voss:"PROPIO·NUCLEO",
  lexico:"NOMBRE·NUCLEO", sintaxis:"NOMBRE·NUCLEO", cifra:"NOMBRE·NUCLEO", nexo:"NOMBRE·NUCLEO", patron:"NOMBRE·NUCLEO",
  senal:"NOMBRE·NUCLEO", umbral:"NOMBRE·NUCLEO", vector:"NOMBRE·NUCLEO", pulso:"NOMBRE·NUCLEO", nodo:"NOMBRE·NUCLEO",
  codigo:"NOMBRE·NUCLEO", glifo:"NOMBRE·NUCLEO", forma:"NOMBRE·NUCLEO", flujo:"NOMBRE·NUCLEO", typo:"PROPIO·NUCLEO" };

function CombatWordPanel({ activeWord, animState }) {
  const word = activeWord?.word || "";
  const typed = activeWord?.typed || "";
  const wordType = WORD_TYPE_MAP[word.toLowerCase()] || "LEXEMA";
  const hexCore = word ? wordHexCore(word) : "——";
  const freq = word ? (300 + ((word.charCodeAt(0) * 7 + word.length * 43) % 400)) : 0;

  return (
    <div style={S.combatWordPanel}>
      <div style={S.combatWordHeader}>
        <span style={S.combatWordHeaderTag}>◊ ENLACE · LEXICO</span>
        <span style={S.transmitting}>● TRANSMITIENDO</span>
      </div>
      <div style={{ ...S.combatWordBox, borderColor: animState==="wrong" ? "#ff2244" : "rgba(0,255,204,0.35)" }}>
        <span style={S.combatWordPrompt}>&gt;</span>
        <div style={S.combatWordLetters}>
          {word ? word.split("").map((ch, i) => {
            const done = i < typed.length; const cur = i === typed.length;
            return (
              <span key={word+i} className={done ? "letter-hit" : ""} style={{
                ...S.combatLetter,
                color: done ? "var(--col-active)" : cur ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                textShadow: done ? "0 0 12px var(--col-active)" : "none",
                borderBottom: cur ? "2px solid rgba(255,255,255,0.7)" : "2px solid transparent",
              }}>{ch}</span>
            );
          }) : <span style={{ color:"rgba(255,255,255,0.12)", fontSize:"1.6rem" }}>_ _ _ _ _</span>}
        </div>
      </div>
      <div style={S.combatWordMeta}>
        <span style={S.combatMetaTag}>{wordType}</span>
        <span style={S.combatMetaDivider}>|</span>
        <span style={S.combatMetaItem}>NUCLEO · <span style={{ color:"var(--col-active)" }}>{hexCore}</span></span>
        <span style={S.combatMetaDivider}>|</span>
        <span style={S.combatMetaItem}>LONG · <span style={{ color:"var(--col-active)" }}>{word.length || "—"}</span></span>
        <span style={S.combatMetaDivider}>|</span>
        <span style={S.combatMetaItem}>FREC · <span style={{ color:"var(--col-active)" }}>{word ? freq+"HZ" : "—"}</span></span>
      </div>
    </div>
  );
}

function LexiconDeck({ combatEnemies, targetId, flowMultiplier }) {
  const sorted = [...(combatEnemies || [])].sort((a,b) => a.distance - b.distance);
  return (
    <div style={S.lexiconDeck}>
      <div style={S.deckHeader}>
        <span style={S.deckHeaderLabel}>MAZO · LEXICO</span>
        <span style={S.deckHeaderCount}>{sorted.length}</span>
      </div>
      <div style={S.deckList}>
        {sorted.slice(0,6).map(e => (
          <div key={e.id} style={{ ...S.deckRow, ...(e.targeted ? S.deckRowActive : {}) }}>
            <span style={S.deckRowBullet}>{e.targeted ? "▸" : " "}</span>
            <span style={{ ...S.deckRowWord, color: e.targeted ? "var(--col-active)" : "rgba(255,255,255,0.55)",
              fontWeight: e.targeted ? "bold" : "normal" }}>{e.word}</span>
            <span style={S.deckRowDistWrap}>
              <WarningTriangle level={getProximityLevel(e.distance)} />
              <span style={S.deckRowDist}>{e.distance}m</span>
            </span>
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={S.deckEmpty}>— LIMPIO —</div>
        )}
      </div>
      {flowMultiplier > 1.0 && (
        <div style={S.deckFlow}>
          <span style={S.deckFlowLabel}>MULTIPLICADOR DE FLUJO</span>
          <span style={{ ...S.deckFlowVal, color: flowMultiplier>=2 ? "#00ff88" : "var(--col-active)",
            textShadow: "0 0 14px "+(flowMultiplier>=2 ? "#00ff88" : "var(--col-active)") }}>
            ×{flowMultiplier.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
}

function WaveAnnouncement({ wave }) {
  if (!wave) return null;
  const isHighWave = wave >= 8;
  return (
    <div className={"wave-fullscreen" + (isHighWave ? " wave-fullscreen-danger" : "") }>
      <div className="wave-fullscreen-inner">
        <span className="wave-fullscreen-tag">{isHighWave ? "ALERTA DE OLEADA" : "NUEVA OLEADA"}</span>
        <span className="wave-fullscreen-num">{String(wave).padStart(2, "0")}</span>
        <span className="wave-fullscreen-sub">{isHighWave ? "RIESGO CRITICO · PRESION MAXIMA" : "EL ENJAMBRE AVANZA"}</span>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function HUD() {
  const [state, setState]     = useState(Bridge.getState());
  const [animState, setAnim]  = useState("idle");
  const [showFlash, setFlash] = useState(false);
  const [waveNotice, setWaveNotice] = useState(null);
  const timerRef              = useRef(null);
  const waveTimerRef          = useRef(null);
  useEffect(() => Bridge.onStateChange(setState), []);
  useEffect(() => {
    const unsub = EventBus.on(EventTypes.WORD_PROGRESS, ({ correct }) => {
      clearTimeout(timerRef.current);
      if (correct) {
        setAnim("correct");
        timerRef.current = setTimeout(() => setAnim("idle"), 150);
      } else {
        setAnim("wrong"); setFlash(true);
        timerRef.current = setTimeout(() => { setAnim("idle"); setFlash(false); }, 340);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = EventBus.on(EventTypes.WAVE_START, ({ waveNumber }) => {
      clearTimeout(waveTimerRef.current);
      setWaveNotice(waveNumber);
      waveTimerRef.current = setTimeout(() => setWaveNotice(null), 1450);
    });
    return () => {
      clearTimeout(waveTimerRef.current);
      unsub();
    };
  }, []);

  const { wpm, accuracy, hp, energy, activeWord, wave, gameMode, flowMultiplier,
    opponentPhraseProgress, currentPhrase, currentPhraseWordIndex,
    playerPhrasesCompleted, countdown, countdownActive, timeRemaining,
    combatEnemies, swarmRemnants, targetId,
    lexHeat = 0, lexHeatMax = 100, isOverheated = false,
    warnings = {},
    preCombatActive = false, preCombatStep = null,
    preCombatValue = null, preCombatMessage = '', preCombatLevel = 'yellow' } = state;

  const isRacing = gameMode === GAME_MODES.RACING;
  const lowHpLevel = warnings?.lowHpLevel ?? 'none';

  if (!isRacing) {
    return (
      <div style={S.hud}>
        {showFlash && <div className="edge-flash" />}
        <LowHpFrame level={lowHpLevel} />
        <div className="hud-safe-zone">
          <PreCombatOverlay
            active={preCombatActive}
            step={preCombatStep}
            value={preCombatValue}
            message={preCombatMessage}
            level={preCombatLevel}
          />
          <WaveAnnouncement wave={waveNotice} />
          <WarningIcon warnings={warnings} />
          {/* Top-left: pilot info */}
          <div style={S.combatTopLeft}>
            <span style={S.pilotName}>KAEL · VOSS</span>
            <span style={S.pilotSub}>TYPO—07 / PILOTO</span>
          </div>
          {/* Top-center: ticker */}
          <CombatTicker />
          {/* Top-right: WPM + accuracy */}
          <CombatTopRight wpm={wpm} accuracy={accuracy} />
          {/* Bottom-left: status bars */}
          <CombatBottomLeft hp={hp} lexHeat={lexHeat} lexHeatMax={lexHeatMax} isOverheated={isOverheated} wave={wave} swarmRemnants={swarmRemnants} warnings={warnings} />
          {/* Bottom-center: active word panel */}
          <CombatWordPanel activeWord={activeWord} animState={animState} />
          {/* Bottom-right: lexicon deck */}
          <LexiconDeck combatEnemies={combatEnemies} targetId={targetId} flowMultiplier={flowMultiplier} />
        </div>
      </div>
    );
  }

  return (
    <div style={S.hud}>
      {showFlash && <div className="edge-flash" />}
      <LowHpFrame level={lowHpLevel} />
      <div className="hud-safe-zone">
        <WaveAnnouncement wave={waveNotice} />
        <WarningIcon warnings={warnings} />
        <Countdown countdown={countdown} countdownActive={countdownActive} />
        {/* Top-left: pilot info */}
        <div style={S.combatTopLeft}>
          <span style={S.pilotName}>KAEL · VOSS</span>
          <span style={S.pilotSub}>TYPO—07 / PILOTO</span>
        </div>
        {/* Top-center: race ticker */}
        <RaceTicker timeRemaining={timeRemaining} playerPhrasesCompleted={playerPhrasesCompleted} />
        {/* Top-right: WPM + accuracy */}
        <CombatTopRight wpm={wpm} accuracy={accuracy} />
        {/* Bottom-left: race stats */}
        <RaceBottomLeft wpm={wpm} accuracy={accuracy} flowMultiplier={flowMultiplier}
          playerPhrasesCompleted={playerPhrasesCompleted || 0}
          opponentPhraseProgress={opponentPhraseProgress || 0} />
        {/* Center: phrase */}
        <RacePhrase currentPhrase={currentPhrase} currentPhraseWordIndex={currentPhraseWordIndex}
          activeWord={activeWord} animState={animState} />
        {/* Bottom-center: timer */}
        <RaceTimer timeRemaining={timeRemaining ?? 60} />
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const S = {
  hud: { position:"absolute", inset:0, pointerEvents:"none",
    fontFamily:"'Orbitron', sans-serif",
    "--col-active":"#00ffcc", "--col-pending":"rgba(255,255,255,0.55)", "--col-ghost-letter":"rgba(255,255,255,0.15)" },

  // ── Combat top-left
  combatTopLeft: { position:"absolute", top:"1.4rem", left:"1.6rem",
    display:"flex", flexDirection:"column", gap:"0.1rem" },
  pilotName: { fontSize:"0.92rem", fontWeight:"bold", letterSpacing:"0.22em", color:"rgba(255,255,255,0.85)" },
  pilotSub:  { fontSize:"0.68rem", letterSpacing:"0.18em", color:"var(--col-active)", opacity:0.7 },

  // ── Combat ticker
  ticker: { position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
    width:"clamp(360px,58vw,860px)", overflow:"hidden", height:"2.4rem",
    display:"flex", alignItems:"center" },
  tickerInner: { width:"100%", overflow:"hidden" },
  tickerText: { display:"inline-block", whiteSpace:"nowrap", fontSize:"0.62rem",
    letterSpacing:"0.22em", color:"rgba(0,255,204,0.55)",
    animation:"tickerScroll 22s linear infinite" },

  // ── Combat top-right
  combatTopRight: { position:"absolute", top:"1.4rem", right:"1.6rem",
    display:"flex", flexDirection:"row", alignItems:"flex-end", gap:"1.6rem" },
  combatStatBlock: { display:"flex", flexDirection:"column", alignItems:"flex-start" },
  combatBigNum: { fontSize:"3.4rem", fontWeight:"bold", letterSpacing:"-0.03em", lineHeight:1, transition:"color 0.4s" },
  combatBigNum2: { fontSize:"2.2rem", fontWeight:"bold", letterSpacing:"-0.02em", lineHeight:1, color:"rgba(255,255,255,0.5)" },
  combatAccRow: { display:"flex", alignItems:"baseline", gap:"0.05rem" },
  combatAccPct: { fontSize:"1.05rem", color:"rgba(255,255,255,0.35)" },
  combatStatLabel: { fontSize:"0.66rem", letterSpacing:"0.3em", color:"rgba(255,255,255,0.22)", marginTop:"0.15rem" },

  // ── Combat bottom-left
  combatBottomLeft: { position:"absolute", bottom:"1.8rem", left:"1.6rem",
    display:"flex", flexDirection:"column", gap:"0.65rem", minWidth:"220px" },
  statusBarRow: { display:"flex", alignItems:"center", gap:"0.7rem" },
  statusBarLabel: { fontSize:"0.62rem", letterSpacing:"0.22em", color:"rgba(255,255,255,0.35)", width:"5.8rem" },
  statusBarTrack: { flex:1, height:"5px", background:"rgba(255,255,255,0.07)", borderRadius:"3px", overflow:"hidden", minWidth:"110px" },
  statusBarFill:  { height:"100%", borderRadius:"2px", transition:"width 0.3s ease" },
  statusBarValue: { fontSize:"0.86rem", fontWeight:"bold", letterSpacing:"0.04em", width:"2.8rem", textAlign:"right" },
  waveBlock: { marginTop:"0.8rem", display:"flex", flexDirection:"column", gap:"0.2rem" },
  waveLabel: { fontSize:"0.56rem", letterSpacing:"0.28em", color:"rgba(255,255,255,0.22)" },
  waveNum:   { fontSize:"3.1rem", fontWeight:"bold", color:"rgba(255,255,255,0.85)", letterSpacing:"-0.02em", lineHeight:1 },
  swarmRem:  { fontSize:"0.58rem", letterSpacing:"0.2em", color:"rgba(255,255,255,0.28)" },

  // ── Combat word panel (bottom-center)
  combatWordPanel: { position:"absolute", bottom:"1.8rem", left:"50%", transform:"translateX(-50%)",
    display:"flex", flexDirection:"column", gap:"0.55rem", minWidth:"430px", alignItems:"center" },
  combatWordHeader: { display:"flex", justifyContent:"space-between", width:"100%",
    fontSize:"0.6rem", letterSpacing:"0.2em" },
  combatWordHeaderTag: { color:"rgba(255,255,255,0.3)" },
  transmitting: { color:"var(--col-active)", opacity:0.75 },
  combatWordBox: { display:"flex", alignItems:"center", gap:"0.8rem", padding:"0.65rem 1.2rem",
    border:"1px solid rgba(0,255,204,0.35)", background:"rgba(0,0,0,0.55)",
    minWidth:"350px", justifyContent:"center", transition:"border-color 0.15s" },
  combatWordPrompt: { fontSize:"1.5rem", color:"rgba(0,255,204,0.4)", userSelect:"none" },
  combatWordLetters: { display:"flex", gap:"0", alignItems:"baseline" },
  combatLetter: { display:"inline-block", fontSize:"2.2rem", fontWeight:"bold",
    letterSpacing:"0.06em", width:"1.25ch", textAlign:"center", lineHeight:1.2,
    transition:"color 0.08s, text-shadow 0.1s" },
  combatWordMeta: { display:"flex", alignItems:"center", gap:"0.5rem", fontSize:"0.58rem",
    flexWrap:"wrap", justifyContent:"center",
    letterSpacing:"0.15em", color:"rgba(255,255,255,0.28)" },
  combatMetaTag: { color:"rgba(255,255,255,0.45)", fontWeight:"bold" },
  combatMetaDivider: { opacity:0.25 },
  combatMetaItem: { color:"rgba(255,255,255,0.28)" },

  // ── Lexicon Deck (bottom-right)
  lexiconDeck: { position:"absolute", bottom:"1.8rem", right:"1.6rem",
    display:"flex", flexDirection:"column", gap:"0", minWidth:"240px",
    border:"1px solid rgba(255,255,255,0.07)", background:"rgba(0,0,0,0.45)", padding:"0.8rem 0" },
  deckHeader: { display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"0 1rem 0.6rem", borderBottom:"1px solid rgba(255,255,255,0.06)" },
  deckHeaderLabel: { fontSize:"0.58rem", letterSpacing:"0.25em", color:"rgba(255,255,255,0.3)" },
  deckHeaderCount: { fontSize:"0.9rem", color:"var(--col-active)", fontWeight:"bold" },
  deckList: { display:"flex", flexDirection:"column", padding:"0.3rem 0" },
  deckRow: { display:"flex", alignItems:"center", gap:"0.45rem", padding:"0.3rem 1rem",
    fontSize:"0.86rem", letterSpacing:"0.04em" },
  deckRowActive: { background:"rgba(0,255,204,0.05)" },
  deckRowBullet: { width:"1rem", fontSize:"0.72rem", color:"var(--col-active)", flexShrink:0 },
  deckRowWord: { flex:1, transition:"color 0.2s" },
  deckRowDistWrap: { display:"inline-flex", alignItems:"center", gap:"0.3rem", minWidth:"3.8rem", justifyContent:"flex-end" },
  deckRowDist: { fontSize:"0.66rem", color:"rgba(255,255,255,0.25)", letterSpacing:"0.05em" },
  deckEmpty: { padding:"0.55rem 1rem", fontSize:"0.62rem", color:"rgba(255,255,255,0.15)",
    letterSpacing:"0.2em", textAlign:"center" },
  deckFlow: { display:"flex", flexDirection:"column", alignItems:"flex-end", padding:"0.5rem 0.8rem 0",
    borderTop:"1px solid rgba(255,255,255,0.06)" },
  deckFlowLabel: { fontSize:"0.54rem", letterSpacing:"0.22em", color:"rgba(255,255,255,0.22)" },
  deckFlowVal: { fontSize:"1.8rem", fontWeight:"bold", letterSpacing:"-0.01em", lineHeight:1.1 },

  // ── Racing
  phraseZone: { position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
    display:"flex", flexDirection:"column", alignItems:"center", gap:"1.2rem", maxWidth:"80vw" },
  phraseWords: { display:"flex", gap:"1rem", flexWrap:"wrap", justifyContent:"center",
    fontSize:"clamp(1.6rem, 3vw, 2.4rem)", fontWeight:"bold", letterSpacing:"0.1em" },
  phraseDone:     { color:"rgba(0,255,140,0.25)" },
  phraseActive:   { letterSpacing:"0.12em" },
  phraseUpcoming: { color:"rgba(255,255,255,0.12)" },

  // ── Race bottom-left stat panel
  raceStatPanel: { display:"flex", flexDirection:"column", gap:"0.3rem" },
  raceStatPanelLabel: { fontSize:"0.56rem", letterSpacing:"0.28em", color:"rgba(255,255,255,0.2)", marginBottom:"0.2rem" },
  raceStatRow: { display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"1rem" },
  raceStatRowLabel: { fontSize:"0.62rem", letterSpacing:"0.2em", color:"rgba(255,255,255,0.25)" },
  raceStatRowVal: { fontSize:"1.2rem", fontWeight:"bold", letterSpacing:"0.04em" },

  // ── Race flow block (in bottom-left)
  raceFlowBlock: { marginTop:"0.8rem", display:"flex", flexDirection:"column", gap:"0.2rem" },
  raceFlowLabel: { fontSize:"0.52rem", letterSpacing:"0.22em", color:"rgba(255,255,255,0.2)" },
  raceFlowVal:   { fontSize:"1.9rem", fontWeight:"bold", letterSpacing:"-0.01em", lineHeight:1 },
  raceFlowTrack: { width:"100%", height:"2px", background:"rgba(255,255,255,0.07)", borderRadius:"1px", overflow:"hidden" },
  raceFlowFill:  { height:"100%", borderRadius:"1px", transition:"width 0.3s ease" },

  // ── Race timer (bottom-center)
  raceTimerPanel: { position:"absolute", bottom:"1.8rem", left:"50%", transform:"translateX(-50%)",
    display:"flex", flexDirection:"column", alignItems:"center", gap:"0.35rem", minWidth:"230px" },
  raceTimerLabel: { fontSize:"0.54rem", letterSpacing:"0.25em", color:"rgba(255,255,255,0.2)" },
  raceTimerNum:   { fontSize:"3.3rem", fontWeight:"bold", letterSpacing:"0.04em", lineHeight:1, transition:"color 0.5s" },
  raceTimerTrack: { width:"240px", height:"3px", background:"rgba(255,255,255,0.07)", borderRadius:"2px", overflow:"hidden" },
  raceTimerFill:  { height:"100%", borderRadius:"1px", transition:"width 1s linear",
    boxShadow:"0 0 6px var(--col-active)" },

  // ── Shared leftover (combat reuses these)
  wordZone: { position:"absolute", bottom:"14%", left:"50%", transform:"translateX(-50%)",
    display:"flex", flexDirection:"column", alignItems:"center", gap:"0.7rem" },
  wordLetters: { display:"flex", gap:"0.04rem", alignItems:"baseline" },
  wordIdle: { fontSize:"clamp(2rem, 4vw, 3.5rem)", color:"rgba(255,255,255,0.08)", letterSpacing:"0.4em", fontWeight:"bold" },
  letter: { display:"inline-block", fontSize:"clamp(2.4rem, 4.5vw, 4rem)", fontWeight:"bold",
    letterSpacing:"0.05em", width:"1.3ch", textAlign:"center", lineHeight:1,
    transition:"color 0.08s, text-shadow 0.12s" },
  progressTrack: { width:"100%", height:"2px", background:"rgba(255,255,255,0.06)", borderRadius:"1px", overflow:"hidden", minWidth:"180px" },
  progressFill: { height:"100%", borderRadius:"1px", transition:"width 0.06s linear, background 0.2s, box-shadow 0.2s" },
  countdownOverlay: { position:"absolute", inset:0, display:"flex", alignItems:"center",
    justifyContent:"center", background:"rgba(0,0,0,0.35)", zIndex:10 },
  countdownNum: { fontSize:"9rem", fontWeight:"bold", letterSpacing:"-0.02em", lineHeight:1 },
};