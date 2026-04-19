import React, { useEffect, useState, useRef } from "react";
import { Bridge } from "../../shared/bridge.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { GAME_MODES } from "../../shared/constants.js";

function WordBox({ activeWord, animState }) {
  const [poppedIdx, setPoppedIdx] = useState(-1);
  useEffect(() => {
    const unsub = EventBus.on(EventTypes.WORD_PROGRESS, ({ typed, correct }) => {
      if (correct && typed.length > 0) {
        setPoppedIdx(typed.length - 1);
        setTimeout(() => setPoppedIdx(-1), 200);
      }
    });
    return unsub;
  }, []);
  if (!activeWord) return null;
  const { word, typed } = activeWord;
  return (
    <div style={styles.wordBoxWrap}>
      <div className={`word-box-${animState}`} style={styles.wordBox}>
        <span style={styles.wordLabel}>TARGET</span>
        <div style={styles.wordLetters}>
          {word.split("").map((ch, i) => {
            const done = i < typed.length; const current = i === typed.length; const popped = i === poppedIdx;
            let color = "#333"; if (done) color = "#00ff88"; if (current) color = "#aaaaaa";
            return <span key={i} className={popped ? "letter-popped" : ""} style={{ ...styles.letter, color }}>{ch}</span>;
          })}
        </div>
        <div style={{ ...styles.cursor, left: `calc(${typed.length} * 1.45rem + 0.9rem)` }} />
      </div>
    </div>
  );
}

function HPBar({ hp }) {
  const pct = Math.max(0, hp); const danger = pct <= 40;
  return (<div style={styles.hpTrack}><div style={{ ...styles.hpFill, width: `${pct}%`, background: danger ? "#ff4466" : "#00ffcc", boxShadow: danger ? "0 0 8px #ff4466" : "0 0 8px #00ffcc" }} /></div>);
}

function ProgressBar({ current, total }) {
  const pct = Math.min(100, total > 0 ? (current / total) * 100 : 0);
  const nearEnd = pct >= 90;
  return (<div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${pct}%`, background: nearEnd ? "#00ff88" : "#00ffcc", boxShadow: nearEnd ? "0 0 8px #00ff88" : "0 0 6px #00ffcc44" }} /></div>);
}

function RaceTimer({ seconds }) {
  const s = Math.max(0, Math.round(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss2 = String(s % 60).padStart(2, "0");
  const col = s <= 5 ? "#ff4466" : s <= 20 ? "#ffcc00" : "#ffffff";
  return <span style={{ ...styles.statValue, color: col, animation: s <= 5 ? "blink 0.5s step-end infinite" : "none" }}>{mm}:{ss2}</span>;
}

function FlowBadge({ mult }) {
  if (mult <= 1.0) return null;
  const col = mult >= 2.0 ? "#00ff88" : "#00ffcc";
  return <span style={{ ...styles.statValue, color: col, fontSize: "0.85rem" }}>FLOW x{mult.toFixed(1)}</span>;
}

export default function HUD() {
  const [state, setState] = useState(Bridge.getState());
  const [animState, setAnimState] = useState("idle");
  const [showFlash, setShowFlash] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => Bridge.onStateChange(setState), []);
  useEffect(() => {
    const unsub = EventBus.on(EventTypes.WORD_PROGRESS, ({ correct }) => {
      clearTimeout(timerRef.current);
      if (correct) { setAnimState("correct"); timerRef.current = setTimeout(() => setAnimState("idle"), 150); }
      else { setAnimState("wrong"); setShowFlash(true); timerRef.current = setTimeout(() => { setAnimState("idle"); setShowFlash(false); }, 340); }
    });
    return unsub;
  }, []);
  const { wpm, accuracy, hp, activeWord, wave, gameMode,
          distanceTraveled, targetDistance, flowMultiplier, timeRemaining } = state;
  const isRacing = gameMode === GAME_MODES.RACING;
  return (
    <div style={styles.hud}>
      {showFlash && <div className="edge-flash" />}
      <div style={styles.topLeft}>
        <Stat label="WPM" value={wpm} />
        <Stat label="ACC" value={`${accuracy}%`} />
        {isRacing ? <FlowBadge mult={flowMultiplier} /> : <Stat label="WAVE" value={wave || 1} />}
      </div>
      {isRacing ? (
        <div style={styles.topRight}>
          <div style={styles.statRow}><span style={styles.statLabel}>TIME</span><RaceTimer seconds={timeRemaining} /></div>
          <ProgressBar current={distanceTraveled} total={targetDistance} />
          <span style={{ ...styles.statLabel, fontSize: "0.6rem" }}>{distanceTraveled} / {targetDistance}</span>
        </div>
      ) : (
        <div style={styles.topRight}>
          <span style={styles.statLabel}>HP</span>
          <HPBar hp={hp} />
          <span style={{ ...styles.statValue, fontSize: "0.75rem" }}>{hp}</span>
        </div>
      )}
      <WordBox activeWord={activeWord} animState={animState} />
    </div>
  );
}

function Stat({ label, value }) {
  return (<div style={styles.statRow}><span style={styles.statLabel}>{label}</span><span style={styles.statValue}>{value}</span></div>);
}
const styles = {
  hud:           { position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: "'Courier New', monospace" },
  topLeft:       { position: 'absolute', top: '1.4rem', left: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  topRight:      { position: 'absolute', top: '1.4rem', right: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', width: '160px' },
  statRow:       { display: 'flex', gap: '0.6rem', alignItems: 'baseline' },
  statLabel:     { fontSize: '0.65rem', color: '#445', letterSpacing: '0.18em' },
  statValue:     { fontSize: '1.1rem', color: '#00ffcc', fontWeight: 'bold', letterSpacing: '0.05em' },
  hpTrack:       { width: '100%', height: '4px', background: '#111', borderRadius: '2px', overflow: 'hidden' },
  hpFill:        { height: '100%', borderRadius: '2px', transition: 'width 0.3s ease, background 0.5s' },
  progressTrack: { width: '100%', height: '5px', background: '#111', borderRadius: '2px', overflow: 'hidden', border: '1px solid #00ffcc44' },
  progressFill:  { height: '100%', borderRadius: '2px', transition: 'width 0.2s ease' },
  wordBoxWrap:   { position: 'absolute', bottom: '3.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  wordBox:       { position: 'relative', background: 'rgba(0,0,8,0.75)', borderRadius: '4px', padding: '0.6rem 0.9rem 0.7rem', minWidth: '12rem', textAlign: 'center', backdropFilter: 'blur(4px)' },
  wordLabel:     { display: 'block', fontSize: '0.55rem', color: '#00ffcc55', letterSpacing: '0.3em', marginBottom: '0.5rem' },
  wordLetters:   { display: 'flex', justifyContent: 'center', gap: '0.05rem', fontSize: '1.6rem', letterSpacing: '0.1em', position: 'relative', minHeight: '2rem' },
  letter:        { display: 'inline-block', transition: 'color 0.1s', lineHeight: 1, width: '1.45rem', textAlign: 'center' },
  cursor:        { position: 'absolute', bottom: '-4px', width: '1.4rem', height: '2px', background: '#00ffcc', borderRadius: '1px', transition: 'left 0.05s', boxShadow: '0 0 6px #00ffcc' },
};
