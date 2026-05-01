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
    return (<div className="hud__word-zone"><span className="hud__word-idle">_ _ _ _ _ _ _</span></div>);
  }
  const { word, typed } = activeWord;
  const progress = typed.length / word.length;
  const progressBg    = animState === "wrong" ? "#ff2244" : "var(--col-active)";
  const progressGlow  = animState === "wrong" ? "0 0 10px #ff2244" : "0 0 8px var(--col-active)";
  return (
    <div className="hud__word-zone">
      <div className={"word-area-" + animState} style={{ display: "flex", gap: "0.04rem", alignItems: "baseline" }}>
        {word.split("").map((ch, i) => {
          const done = i < typed.length; const current = i === typed.length; const popped = i === poppedIdx;
          const wrong = i === wrongIdx;
          const letterColor = done ? "var(--col-active)" : current ? "var(--col-pending)" : "var(--col-ghost-letter)";
          return (
            <span key={word+"-"+i}
              className={`hud__letter${wrong ? " letter-wrong" : popped ? " letter-popped" : ""}`}
              style={{ color: letterColor, textShadow: done ? "0 0 14px var(--col-active)" : "none" }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div className="hud__progress-track">
        <div className="hud__progress-fill" style={{ width: (progress*100)+"%", background: progressBg, boxShadow: progressGlow }} />
      </div>
    </div>
  );
}

// ─── Racing ─────────────────────────────────────────────────────────────────

function RaceTicker({ timeRemaining, playerPhrasesCompleted }) {
  const s = Math.max(0, Math.round(timeRemaining ?? 60));
  const msg = `◂  PROTOCOLO · SPRINT · ACTIVO  ▸  SECUENCIAS · ${String(playerPhrasesCompleted || 0).padStart(2,"0")} · TRANSMITIDAS  ▸  TIEMPO · ${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")} · RESTANTE  ▸  SISTEMA · FLUJO · ESTABLE  ▸  `;
  return (
    <div className="hud__ticker">
      <div className="hud__ticker-inner">
        <span className="hud__ticker-text">{msg}{msg}</span>
      </div>
    </div>
  );
}

function RaceBottomLeft({ flowMultiplier, playerPhrasesCompleted, opponentPhraseProgress }) {
  const oppDone = Math.floor(opponentPhraseProgress);
  const winning = playerPhrasesCompleted > oppDone;
  const flowPct = Math.min(100, ((flowMultiplier - 1.0) / 1.0) * 100);
  const flowColor = flowMultiplier >= 2 ? "#00ff88" : "var(--col-active)";
  const statusColor = winning ? "#00ff88" : "#ff4466";
  return (
    <div className="combat__bottom-left">
      <div className="race__stat-panel">
        <span className="race__stat-panel-label">ESTADO · SPRINT</span>
        <div className="race__stat-row">
          <span className="race__stat-row-label">SECUENCIAS</span>
          <span className="race__stat-row-val" style={{ color: "var(--col-active)" }}>{String(playerPhrasesCompleted).padStart(2,"0")}</span>
        </div>
        <div className="race__stat-row">
          <span className="race__stat-row-label">OPONENTE</span>
          <span className="race__stat-row-val" style={{ color: winning ? "rgba(255,255,255,0.4)" : "#ff4466" }}>{String(oppDone).padStart(2,"0")}</span>
        </div>
        <div className="race__stat-row" style={{ marginTop: "0.2rem" }}>
          <span className="race__stat-row-label" style={{ color: statusColor, letterSpacing: "0.15em" }}>
            {winning ? "▲ DELANTE" : "▼ DETRAS"}
          </span>
        </div>
      </div>
      {flowMultiplier > 1.0 && (
        <div className="race__flow-block">
          <span className="race__flow-label">MULTIPLICADOR DE FLUJO</span>
          <span className="race__flow-val" style={{ color: flowColor, textShadow: "0 0 16px " + flowColor }}>
            ×{flowMultiplier.toFixed(1)}
          </span>
          <div className="race__flow-track">
            <div className="race__flow-fill" style={{ width: flowPct+"%", background: flowColor }} />
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
    <div className="race__phrase-zone">
      <div className={"word-area-" + animState + " race__phrase-words"}>
        {currentPhrase.map((word, wi) => {
          if (wi < currentPhraseWordIndex) return <span key={wi} className="race__phrase-done">{word}</span>;
          if (wi === currentPhraseWordIndex) return (
            <span key={wi} className="race__phrase-active">
              {word.split("").map((ch, ci) => (
                <span key={ci} style={{
                  color: ci<typed.length ? "var(--col-active)" : ci===typed.length ? "var(--col-pending)" : "var(--col-ghost-letter)",
                  textShadow: ci<typed.length ? "0 0 12px var(--col-active)" : "none" }}>
                  {ch}
                </span>
              ))}
            </span>
          );
          return <span key={wi} className="race__phrase-upcoming">{word}</span>;
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
  const fillBg = s<=10 ? "#ff4466" : s<=20 ? "#ffcc00" : "linear-gradient(90deg,#00ffcc,#00ff88)";
  return (
    <div className="race__timer-panel">
      <span className="race__timer-label">TIEMPO · RESTANTE</span>
      <span className="race__timer-num" style={{ color: col, textShadow: "0 0 20px "+col, animation: s<=10 ? "blink 0.5s step-end infinite" : "none" }}>
        {mm}:{ss2}
      </span>
      <div className="race__timer-track">
        <div className="race__timer-fill" style={{ width: (100-timePct)+"%", background: fillBg }} />
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
    <div className="hud__countdown-overlay">
      <span className="hud__countdown-num" style={{ color: col, textShadow: "0 0 60px "+col+", 0 0 120px "+col }}>
        {label}
      </span>
    </div>
  );
}

function FlowModeOverlay({ flowActive }) {
  const [showPopup, setShowPopup] = useState(false);
  const prevActive = useRef(false);

  useEffect(() => {
    if (!prevActive.current && flowActive) {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 1600);
    }
    prevActive.current = flowActive;
  }, [flowActive]);

  if (!showPopup) return null;

  return (
    <div className="precombat-overlay" style={{ background: "radial-gradient(circle at center, rgba(153,0,255,0.15) 0%, rgba(0,0,0,0.52) 62%, rgba(0,0,0,0.7) 100%)", zIndex: 40 }}>
      <div className="precombat-frame" style={{ borderColor: "rgba(204,0,255,0.6)", animation: "precombat-number-pop 0.24s ease-out, flow-frame-pulse-anim 0.4s ease-in-out infinite" }}>
        <span className="precombat-phase" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 0 10px rgba(204,0,255,0.6)" }}>FLUJO DESBLOQUEADO</span>
        <span className="precombat-value" style={{ color: "#e888ff", textShadow: "0 0 30px rgba(204,0,255,0.9), 0 0 90px rgba(204,0,255,0.6)" }}>100%</span>
        <span className="precombat-message" style={{ color: "#fff", textShadow: "0 0 10px rgba(204,0,255,0.6)" }}>SINCRONIZACIÓN LÉXICA ACTIVA</span>
      </div>
      <div className="precombat-scanline" style={{ background: "rgba(204,0,255,0.4)", boxShadow: "0 0 20px rgba(204,0,255,0.6)" }} />
    </div>
  );
}

// ─── Combat ─────────────────────────────────────────────────────────────────

function CombatTicker() {
  const msg = "◂  FIRMA DEL ENJAMBRE · DETECTADA  ▸  LEXICO · HOSTIL  ▸  PROTOCOLO LEXICO · EN CURSO  ▸  PROGRAMA TYPO · ACTIVO  ▸  ";
  return (
    <div className="hud__ticker">
      <div className="hud__ticker-inner">
        <span className="hud__ticker-text">{msg}{msg}</span>
      </div>
    </div>
  );
}

function CombatTopRight({ wpm, accuracy }) {
  const wpmCol = wpm>=60 ? "var(--col-active)" : wpm>=30 ? "#ffcc00" : wpm>0 ? "#ff6644" : "rgba(255,255,255,0.35)";
  return (
    <div className="combat__top-right">
      <div className="combat__stat-block">
        <span className="combat__big-num" style={{ color: wpmCol, textShadow: wpm>=60 ? "0 0 20px "+wpmCol : "none" }}>{wpm}</span>
        <span className="combat__stat-label">PPM</span>
      </div>
      <div className="combat__stat-block combat__stat-block--right">
        <div className="combat__acc-row">
          <span className="combat__big-num-2">{accuracy}</span>
          <span className="combat__acc-pct">%</span>
        </div>
        <span className="combat__stat-label">PRECISION</span>
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

function WarningIcon({ warnings, flow = 0, flowActive = false, flowCooldown = false }) {
  const proximityLevel = warnings?.proximityLevel ?? 'none';
  const lowHpLevel = warnings?.lowHpLevel ?? 'none';
  const distance = warnings?.closestEnemyDistance;

  const boxes = [];
  const infos = [];

  if (proximityLevel !== 'none') {
    boxes.push({ level: proximityLevel, label: proximityLevel === 'red' ? 'OBJETO CERCANO' : 'OBJETO CERCA', detail: `${distance ?? '--'}M` });
  }
  if (lowHpLevel !== 'none') {
    boxes.push({ level: lowHpLevel, label: lowHpLevel === 'red' ? 'VIDA BAJA' : 'VIDA MEDIA', detail: null });
  }
  if (flowActive) {
    infos.push({ label: 'FLUJO·LEX', detail: 'ACTIVO', color: '#00ff88' });
  } else if (flowCooldown) {
    infos.push({ label: 'RECARGA·LEX', detail: null, color: '#4466ff' });
  } else if (flow >= 70) {
    infos.push({ label: 'FLUJO PRÓXIMO', detail: `${Math.round(flow)}%`, color: '#00ddff' });
  }

  if (boxes.length === 0 && infos.length === 0) return null;

  return (
    <div className="warning-stack">
      {boxes.map((box) => (
        <WarningBox key={`${box.label}-${box.detail ?? 'x'}`} level={box.level} label={box.label} detail={box.detail} />
      ))}
      {infos.map((info) => (
        <InfoBox key={info.label} label={info.label} detail={info.detail} color={info.color} />
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
        <span className={`precombat-value${engage ? ' precombat-value-engage' : ''}`}>{value ?? '...'}</span>
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
    <div className={flash ? "status-bar__row status-bar-flash" : "status-bar__row"}>
      <span className="status-bar__label">{label}</span>
      <div className="status-bar__track">
        <div className="status-bar__fill" style={{ width: pct+"%", background: col, boxShadow: "0 0 5px "+col }} />
      </div>
      <span className="status-bar__value" style={{ color: col }}>{String(Math.round(value)).padStart(3,"0")}</span>
    </div>
  );
}

function FlowBar({ flow, active, cooldown }) {
  const pct   = Math.max(0, Math.min(100, flow));
  const color = active        ? '#9966ff'
    : pct >= 75               ? '#8855ff'
    : pct >= 50               ? '#7744ff'
    : pct >= 25               ? '#aa77ff'
    :                           '#cc99ff';
  return (
    <div className="status-bar__row">
      <span className="status-bar__label" style={{ color: 'rgba(255,255,255,0.92)' }}>FLOW</span>
      <div className="status-bar__track" style={{ position: 'relative' }}>
        <div className="status-bar__fill" style={{ width: pct + '%', background: color, boxShadow: '0 0 12px ' + color, opacity: cooldown ? 0.4 : 1 }} />
        {active && <div className="flow-bar-active-pulse" style={{ position: 'absolute', inset: 0, background: color, opacity: 0.18 }} />}
      </div>
      <span className="status-bar__value" style={{ color }}>{String(Math.round(pct)).padStart(3, '0')}</span>
    </div>
  );
}

function CombatBottomLeft({ hp, flow = 0, flowActive = false, flowCooldown = false, wave, swarmRemnants, warnings }) {
  const lowHpLevel = warnings?.lowHpLevel ?? 'none';
  const hpForceColor = lowHpLevel === 'red' ? '#ff4466' : lowHpLevel === 'yellow' ? '#ffcc00' : undefined;
  return (
    <div className="combat__bottom-left">
      <StatusBar label="VIDA" value={hp} danger forceColor={hpForceColor} flash={lowHpLevel === 'red'} />
      <FlowBar flow={flow} active={flowActive} cooldown={flowCooldown} />
      <div className="wave-block">
        <span className="wave-block__label">OLEADA · LEXICA</span>
        <span className="wave-block__num">{String(wave || 0).padStart(2,"0")}</span>
        <span className="wave-block__rem">RESTOS DEL ENJAMBRE <span style={{ color: "var(--col-active)" }}>{swarmRemnants}</span></span>
      </div>
    </div>
  );
}

function FlowFrame() {
  return (
    <div className="flow-frame">
      <div className="flow-frame-corner flow-frame-corner-tl" />
      <div className="flow-frame-corner flow-frame-corner-tr" />
      <div className="flow-frame-corner flow-frame-corner-bl" />
      <div className="flow-frame-corner flow-frame-corner-br" />
      <div className="flow-frame-scan flow-frame-scan-top" />
      <div className="flow-frame-scan flow-frame-scan-bottom" />
      <div className="flow-frame-caption">FLUJO · LEX · ACTIVO</div>
    </div>
  );
}

function InfoBox({ label, detail, color = '#00ff88' }) {
  return (
    <div className="info-icon" style={{ borderColor: color + '55', color, boxShadow: `0 0 14px ${color}22` }}>
      <span className="warning-icon-mark">◈</span>
      <span className="warning-icon-text">
        <span className="warning-icon-title">{label}</span>
        {detail ? <span className="warning-icon-detail">{detail}</span> : null}
      </span>
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
  const boxBorderColor = animState === "wrong" ? "#ff2244" : "rgba(0,255,204,0.35)";

  return (
    <div className="combat__word-panel">
      <div className="combat__word-header">
        <span className="combat__word-header-tag">◊ ENLACE · LEXICO</span>
        <span className="combat__transmitting">● TRANSMITIENDO</span>
      </div>
      <div className="combat__word-box" style={{ borderColor: boxBorderColor }}>
        <span className="combat__word-prompt">&gt;</span>
        <div className="combat__word-letters">
          {word ? word.split("").map((ch, i) => {
            const done = i < typed.length; const cur = i === typed.length;
            return (
              <span key={word+i}
                className={`combat__letter${done ? " letter-hit" : ""}`}
                style={{
                  color: done ? "var(--col-active)" : cur ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                  textShadow: done ? "0 0 12px var(--col-active)" : "none",
                  borderBottom: cur ? "2px solid rgba(255,255,255,0.7)" : "2px solid transparent",
                }}>{ch}</span>
            );
          }) : <span style={{ color:"rgba(255,255,255,0.12)", fontSize:"1.6rem" }}>_ _ _ _ _</span>}
        </div>
      </div>
      <div className="combat__word-meta">
        <span className="combat__meta-tag">{wordType}</span>
        <span className="combat__meta-divider">|</span>
        <span className="combat__meta-item">NUCLEO · <span style={{ color:"var(--col-active)" }}>{hexCore}</span></span>
        <span className="combat__meta-divider">|</span>
        <span className="combat__meta-item">LONG · <span style={{ color:"var(--col-active)" }}>{word.length || "—"}</span></span>
        <span className="combat__meta-divider">|</span>
        <span className="combat__meta-item">FREC · <span style={{ color:"var(--col-active)" }}>{word ? freq+"HZ" : "—"}</span></span>
      </div>
    </div>
  );
}

function LexiconDeck({ combatEnemies, targetId, flowMultiplier }) {
  const sorted = [...(combatEnemies || [])].sort((a,b) => a.distance - b.distance);
  const flowColor = flowMultiplier >= 2 ? "#00ff88" : "var(--col-active)";
  return (
    <div className="lexicon-deck">
      <div className="lexicon-deck__header">
        <span className="lexicon-deck__header-label">MAZO · LEXICO</span>
        <span className="lexicon-deck__header-count">{sorted.length}</span>
      </div>
      <div className="lexicon-deck__list">
        {sorted.slice(0,6).map(e => (
          <div key={e.id} className={`lexicon-deck__row${e.targeted ? " lexicon-deck__row--active" : ""}`}>
            <span className="lexicon-deck__bullet">{e.targeted ? "▸" : " "}</span>
            <span className="lexicon-deck__word" style={{ color: e.targeted ? "var(--col-active)" : "rgba(255,255,255,0.55)", fontWeight: e.targeted ? "bold" : "normal" }}>{e.word}</span>
            <span className="lexicon-deck__dist-wrap">
              <WarningTriangle level={getProximityLevel(e.distance)} />
              <span className="lexicon-deck__dist">{e.distance}m</span>
            </span>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="lexicon-deck__empty">— LIMPIO —</div>
        )}
      </div>
      {flowMultiplier > 1.0 && (
        <div className="lexicon-deck__flow">
          <span className="lexicon-deck__flow-label">MULTIPLICADOR DE FLUJO</span>
          <span className="lexicon-deck__flow-val" style={{ color: flowColor, textShadow: "0 0 14px " + flowColor }}>
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
    <div className={"wave-fullscreen" + (isHighWave ? " wave-fullscreen-danger" : "")}>
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
    flow = 0, flowActive = false, flowCooldown = false,
    warnings = {},
    preCombatActive = false, preCombatStep = null,
    preCombatValue = null, preCombatMessage = '', preCombatLevel = 'yellow' } = state;

  const isRacing = gameMode === GAME_MODES.RACING;
  const lowHpLevel = warnings?.lowHpLevel ?? 'none';

  if (!isRacing) {
    return (
      <div className="hud">
        {showFlash && <div className="edge-flash" />}
        {flowActive && <FlowFrame />}
        <LowHpFrame level={lowHpLevel} />
        <div className="hud-safe-zone">
          <PreCombatOverlay active={preCombatActive} step={preCombatStep} value={preCombatValue} message={preCombatMessage} level={preCombatLevel} />
          <WaveAnnouncement wave={waveNotice} />
          <WarningIcon warnings={warnings} flow={flow} flowActive={flowActive} flowCooldown={flowCooldown} />
          <div className="combat__top-left">
            <span className="hud__pilot-name">KAEL · VOSS</span>
            <span className="hud__pilot-sub">TYPO—07 / PILOTO</span>
          </div>
          <CombatTicker />
          <CombatTopRight wpm={wpm} accuracy={accuracy} />
          <CombatBottomLeft hp={hp} flow={flow} flowActive={flowActive} flowCooldown={flowCooldown} wave={wave} swarmRemnants={swarmRemnants} warnings={warnings} />
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
        <RaceBottomLeft wpm={wpm} accuracy={accuracy} flowMultiplier={flowMultiplier}
          playerPhrasesCompleted={playerPhrasesCompleted || 0}
          opponentPhraseProgress={opponentPhraseProgress || 0} />
        <RacePhrase currentPhrase={currentPhrase} currentPhraseWordIndex={currentPhraseWordIndex}
          activeWord={activeWord} animState={animState} />
        <RaceTimer timeRemaining={timeRemaining ?? 60} />
      </div>
    </div>
  );
}
