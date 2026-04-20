import React, { useEffect, useState, useRef } from "react";
import { Bridge } from "../../shared/bridge.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { GAME_MODES } from "../../shared/constants.js";

// --- Combat word box ---
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

// --- Race: phrase display above bars ---
function RacePhraseDisplay({ currentPhrase, currentPhraseWordIndex, activeWord, animState }) {
  if (!currentPhrase) return null;
  const typed = activeWord?.typed || '';
  return (
    <div style={styles.phraseWrap}>
      <div className={`word-box-${animState}`} style={styles.phraseBox}>
        <span style={styles.wordLabel}>FRASE ACTIVA</span>
        <div style={styles.phraseWords}>
          {currentPhrase.map((word, wi) => {
            if (wi < currentPhraseWordIndex) {
              return (
                <span key={wi} style={styles.phraseDone}>{word}</span>
              );
            } else if (wi === currentPhraseWordIndex) {
              return (
                <span key={wi} style={styles.phraseCurrent}>
                  {word.split('').map((ch, ci) => {
                    let color = '#555';
                    if (ci < typed.length) color = '#00ff88';
                    else if (ci === typed.length) color = '#cccccc';
                    return <span key={ci} style={{ color }}>{ch}</span>;
                  })}
                </span>
              );
            } else {
              return <span key={wi} style={styles.phraseUpcoming}>{word}</span>;
            }
          })}
        </div>
      </div>
    </div>
  );
}

// --- Race: dual progress bars ---
function RaceBars({ phraseProgress, opponentPhraseProgress, playerPhrasesCompleted, totalPhrases }) {
  const playerPct   = Math.min(100, phraseProgress * 100);
  const opponentPct = Math.min(100, opponentPhraseProgress * 100);
  const oppDone     = Math.min(totalPhrases, Math.round(opponentPhraseProgress * totalPhrases));
  return (
    <div style={styles.raceBarsWrap}>
      <div style={styles.raceBarRow}>
        <span style={{ ...styles.raceBarLabel, color: '#00ffcc' }}>KAEL</span>
        <div style={styles.raceBarTrack}>
          <div style={{ ...styles.raceBarFill, width: `${playerPct}%`, background: '#00ffcc', boxShadow: '0 0 8px #00ffcc88' }} />
        </div>
        <span style={styles.raceBarCount}>{playerPhrasesCompleted}/{totalPhrases}</span>
      </div>
      <div style={styles.raceBarRow}>
        <span style={{ ...styles.raceBarLabel, color: '#ff4444' }}>RIVAL</span>
        <div style={styles.raceBarTrack}>
          <div style={{ ...styles.raceBarFill, width: `${opponentPct}%`, background: '#ff3344', boxShadow: '0 0 8px #ff334488' }} />
        </div>
        <span style={styles.raceBarCount}>{oppDone}/{totalPhrases}</span>
      </div>
    </div>
  );
}

// --- Countdown overlay ---
function Countdown({ countdown, countdownActive }) {
  const [showGo, setShowGo] = useState(false);
  const prevActive = useRef(true);

  useEffect(() => {
    if (prevActive.current && !countdownActive) {
      setShowGo(true);
      setTimeout(() => setShowGo(false), 900);
    }
    prevActive.current = countdownActive;
  }, [countdownActive]);

  if (!countdownActive && !showGo) return null;

  const label = showGo ? 'GO!' : (countdown > 0 ? String(countdown) : '');
  const col   = showGo ? '#00ff88' : '#ffffff';

  return (
    <div style={styles.countdownOverlay}>
      <span style={{ ...styles.countdownNum, color: col, textShadow: `0 0 60px ${col}, 0 0 120px ${col}` }}>
        {label}
      </span>
    </div>
  );
}

function HPBar({ hp }) {
  const pct = Math.max(0, hp); const danger = pct <= 40;
  return (<div style={styles.hpTrack}><div style={{ ...styles.hpFill, width: `${pct}%`, background: danger ? "#ff4466" : "#00ffcc", boxShadow: danger ? "0 0 8px #ff4466" : "0 0 8px #00ffcc" }} /></div>);
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

  const {
    wpm, accuracy, hp, activeWord, wave, gameMode,
    flowMultiplier,
    phraseProgress, opponentPhraseProgress,
    currentPhrase, currentPhraseWordIndex,
    totalPhrases, playerPhrasesCompleted,
    countdown, countdownActive,
  } = state;

  const isRacing = gameMode === GAME_MODES.RACING;

  return (
    <div style={styles.hud}>
      {showFlash && <div className="edge-flash" />}

      {isRacing && (
        <Countdown countdown={countdown} countdownActive={countdownActive} />
      )}

      <div style={styles.topLeft}>
        <Stat label="WPM" value={wpm} />
        <Stat label="ACC" value={`${accuracy}%`} />
        {isRacing
          ? <FlowBadge mult={flowMultiplier} />
          : <Stat label="WAVE" value={wave || 1} />
        }
      </div>

      {!isRacing && (
        <div style={styles.topRight}>
          <span style={styles.statLabel}>HP</span>
          <HPBar hp={hp} />
          <span style={{ ...styles.statValue, fontSize: "0.75rem" }}>{hp}</span>
        </div>
      )}

      {isRacing ? (
        <>
          <RacePhraseDisplay
            currentPhrase={currentPhrase}
            currentPhraseWordIndex={currentPhraseWordIndex}
            activeWord={activeWord}
            animState={animState}
          />
          <RaceBars
            phraseProgress={phraseProgress}
            opponentPhraseProgress={opponentPhraseProgress}
            playerPhrasesCompleted={playerPhrasesCompleted}
            totalPhrases={totalPhrases || 8}
          />
        </>
      ) : (
        <WordBox activeWord={activeWord} animState={animState} />
      )}
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
  // Combat word box
  wordBoxWrap:   { position: 'absolute', bottom: '3.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  wordBox:       { position: 'relative', background: 'rgba(0,0,8,0.75)', borderRadius: '4px', padding: '0.6rem 0.9rem 0.7rem', minWidth: '12rem', textAlign: 'center', backdropFilter: 'blur(4px)' },
  wordLabel:     { display: 'block', fontSize: '0.55rem', color: '#00ffcc55', letterSpacing: '0.3em', marginBottom: '0.5rem' },
  wordLetters:   { display: 'flex', justifyContent: 'center', gap: '0.05rem', fontSize: '1.6rem', letterSpacing: '0.1em', position: 'relative', minHeight: '2rem' },
  letter:        { display: 'inline-block', transition: 'color 0.1s', lineHeight: 1, width: '1.45rem', textAlign: 'center' },
  cursor:        { position: 'absolute', bottom: '-4px', width: '1.4rem', height: '2px', background: '#00ffcc', borderRadius: '1px', transition: 'left 0.05s', boxShadow: '0 0 6px #00ffcc' },
  // Race phrase display
  phraseWrap:    { position: 'absolute', bottom: '8rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  phraseBox:     { position: 'relative', background: 'rgba(0,0,8,0.8)', borderRadius: '4px', padding: '0.7rem 1.2rem 0.8rem', textAlign: 'center', backdropFilter: 'blur(4px)', minWidth: '20rem' },
  phraseWords:   { display: 'flex', gap: '0.7rem', fontSize: '1.5rem', letterSpacing: '0.08em', flexWrap: 'wrap', justifyContent: 'center' },
  phraseDone:    { color: '#00ff8866', fontWeight: 'bold' },
  phraseCurrent: { color: '#cccccc', fontWeight: 'bold', letterSpacing: '0.12em' },
  phraseUpcoming:{ color: '#333333' },
  // Race bars
  raceBarsWrap:  { position: 'absolute', bottom: '1.8rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '420px' },
  raceBarRow:    { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  raceBarLabel:  { fontSize: '0.6rem', letterSpacing: '0.2em', fontWeight: 'bold', width: '2.5rem', textAlign: 'right' },
  raceBarTrack:  { flex: 1, height: '6px', background: '#111', borderRadius: '3px', overflow: 'hidden', border: '1px solid #ffffff11' },
  raceBarFill:   { height: '100%', borderRadius: '3px', transition: 'width 0.25s ease' },
  raceBarCount:  { fontSize: '0.6rem', color: '#555', width: '2rem', textAlign: 'left' },
  // Countdown
  countdownOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 10 },
  countdownNum:  { fontSize: '9rem', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1 },
};
