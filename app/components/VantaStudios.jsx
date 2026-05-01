import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>[]{}|/\\';

function ScrambleText({ text, isScrambling, delay = 0, duration = 1500 }) {
  const [displayText, setDisplayText] = useState(() => 
    text.split('').map(c => c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  );
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isScrambling || isComplete) return;

    const startDelay = setTimeout(() => {
      const iterations = 10;
      const intervalTime = Math.max(20, duration / (text.length * iterations));
      let currentIndex = 0;
      let iteration = 0;

      const interval = setInterval(() => {
        setDisplayText(
          text
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' ';
              if (index < currentIndex) return text[index];
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join('')
        );

        iteration++;
        if (iteration >= iterations) {
          iteration = 0;
          currentIndex++;
        }

        if (currentIndex > text.length) {
          clearInterval(interval);
          setDisplayText(text);
          setIsComplete(true);
        }
      }, intervalTime);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startDelay);
  }, [isScrambling, text, duration, delay, isComplete]);

  return (
    <span style={{ fontFamily: "'Orbitron', 'Courier New', monospace" }}>
      {displayText}
    </span>
  );
}

export default function VantaStudios({ onComplete, duration = 6500 }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const onCompleteRef = React.useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Phase 1: Start scramble animation (after initial fade in)
    const phase1Timer = setTimeout(() => setPhase(1), 400);
    
    // Phase 2: Show tagline (after title scramble completes ~2200ms)
    const phase2Timer = setTimeout(() => setPhase(2), 2600);
    
    // Phase 3: Fade out (give tagline ~2500ms to complete + display)
    const phase3Timer = setTimeout(() => {
      setIsVisible(false);
    }, duration - 1000);

    // Complete
    const completeTimer = setTimeout(() => {
      onCompleteRef.current?.();
    }, duration);

    return () => {
      clearTimeout(phase1Timer);
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      clearTimeout(completeTimer);
    };
  }, [duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={styles.container}
        >
          {/* Background particles/noise effect */}
          <div style={styles.noiseOverlay} />
          
          {/* Scanlines effect */}
          <div style={styles.scanlines} />

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={styles.content}
          >
            {/* Logo symbol */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={styles.logoSymbol}
            >
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                fill="none"
                style={styles.svg}
              >
                {/* Abstract V shape with glitch effect */}
                <motion.path
                  d="M40 70 L10 20 L25 20 L40 50 L55 20 L70 20 L40 70Z"
                  stroke="#00ffcc"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.5 }}
                />
                <motion.path
                  d="M40 65 L15 20 L22 20 L40 48 L58 20 L65 20 L40 65Z"
                  fill="rgba(0, 255, 204, 0.1)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                />
                {/* Horizontal accent lines */}
                <motion.line
                  x1="5" y1="40" x2="30" y2="40"
                  stroke="#00ffcc"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 1.4 }}
                />
                <motion.line
                  x1="50" y1="40" x2="75" y2="40"
                  stroke="#00ffcc"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 1.4 }}
                />
              </svg>
            </motion.div>

            {/* Studio name with scramble effect */}
            <div style={styles.studioName}>
              {phase >= 1 && (
                <ScrambleText
                  text="VANTA STUDIOS"
                  isScrambling={phase >= 1}
                  duration={1800}
                />
              )}
            </div>

            {/* Tagline */}
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={styles.tagline}
              >
                <ScrambleText
                  text="FROM DARKNESS, WE CREATE"
                  isScrambling={true}
                  delay={0}
                  duration={1000}
                />
              </motion.div>
            )}

            {/* Decorative lines */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase >= 1 ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={styles.decorativeLine}
            />
          </motion.div>

          {/* Corner accents */}
          <div style={{ ...styles.corner, top: 20, left: 20 }}>
            <div style={{ ...styles.cornerLine, width: 40, height: 2 }} />
            <div style={{ ...styles.cornerLine, width: 2, height: 40 }} />
          </div>
          <div style={{ ...styles.corner, top: 20, right: 20 }}>
            <div style={{ ...styles.cornerLine, width: 40, height: 2, marginLeft: 'auto' }} />
            <div style={{ ...styles.cornerLine, width: 2, height: 40, marginLeft: 'auto' }} />
          </div>
          <div style={{ ...styles.corner, bottom: 20, left: 20 }}>
            <div style={{ ...styles.cornerLine, width: 2, height: 40 }} />
            <div style={{ ...styles.cornerLine, width: 40, height: 2 }} />
          </div>
          <div style={{ ...styles.corner, bottom: 20, right: 20 }}>
            <div style={{ ...styles.cornerLine, width: 2, height: 40, marginLeft: 'auto' }} />
            <div style={{ ...styles.cornerLine, width: 40, height: 2, marginLeft: 'auto' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #000008 0%, #0a0a12 50%, #000008 100%)',
    zIndex: 9999,
    overflow: 'hidden',
  },
  noiseOverlay: {
    position: 'absolute',
    inset: 0,
    opacity: 0.03,
    background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 204, 0.01) 2px, rgba(0, 255, 204, 0.01) 4px)',
    pointerEvents: 'none',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    zIndex: 1,
  },
  logoSymbol: {
    marginBottom: '0.5rem',
  },
  svg: {
    filter: 'drop-shadow(0 0 10px rgba(0, 255, 204, 0.5))',
  },
  studioName: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 'clamp(1.5rem, 5vw, 3rem)',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
    textShadow: '0 0 20px rgba(0, 255, 204, 0.3), 0 0 40px rgba(0, 255, 204, 0.1)',
    minHeight: '3rem',
  },
  tagline: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 'clamp(0.6rem, 1.5vw, 0.85rem)',
    color: 'rgba(0, 255, 204, 0.7)',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    minHeight: '1.2rem',
  },
  decorativeLine: {
    width: '200px',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(0, 255, 204, 0.5), transparent)',
    marginTop: '1rem',
  },
  corner: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  cornerLine: {
    background: 'rgba(0, 255, 204, 0.3)',
  },
};
