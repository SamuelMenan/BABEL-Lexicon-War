import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Spark particle component
function Spark({ x, y, angle, delay, color }) {
  const distance = 80 + Math.random() * 120;
  const endX = x + Math.cos(angle) * distance;
  const endY = y + Math.sin(angle) * distance;
  const size = 2 + Math.random() * 4;
  const duration = 0.4 + Math.random() * 0.4;

  return (
    <motion.div
      initial={{ 
        x, 
        y, 
        opacity: 1, 
        scale: 1 
      }}
      animate={{ 
        x: endX, 
        y: endY, 
        opacity: 0, 
        scale: 0 
      }}
      transition={{ 
        duration, 
        delay, 
        ease: "easeOut" 
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}`,
        pointerEvents: 'none',
      }}
    />
  );
}

// Generate sparks at collision point
function SparkBurst({ active, centerX, centerY }) {
  const [sparks, setSparks] = useState([]);

  useEffect(() => {
    if (active) {
      const newSparks = [];
      const sparkCount = 40;
      const colors = ['#00ffcc', '#00ddff', '#ffffff', '#ffcc00', '#ff6644'];
      
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
        newSparks.push({
          id: i,
          x: centerX,
          y: centerY,
          angle,
          delay: Math.random() * 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      setSparks(newSparks);
    }
  }, [active, centerX, centerY]);

  if (!active) return null;

  return (
    <>
      {sparks.map((spark) => (
        <Spark key={spark.id} {...spark} />
      ))}
    </>
  );
}

// Flash effect on collision
function CollisionFlash({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(0,255,204,0.4) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}

// Shockwave ring effect
function Shockwave({ active, centerX, centerY }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            position: 'absolute',
            left: centerX - 50,
            top: centerY - 50,
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: '2px solid #00ffcc',
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}

export default function TitleAnimation({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [showSparks, setShowSparks] = useState(false);
  const [screenCenter, setScreenCenter] = useState({ x: 0, y: 0 });
  const onCompleteRef = React.useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setScreenCenter({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 20,
    });
  }, []);

  useEffect(() => {
    // Phase 0: Initial state
    // Phase 1: Images start moving toward center
    const phase1Timer = setTimeout(() => setPhase(1), 300);
    
    // Phase 2: Collision - trigger sparks
    const phase2Timer = setTimeout(() => {
      setPhase(2);
      setShowSparks(true);
    }, 1100);

    // Phase 3: Images shake and settle
    const phase3Timer = setTimeout(() => setPhase(3), 1300);

    // Phase 4: Fade to combined title
    const phase4Timer = setTimeout(() => setPhase(4), 1800);

    // Complete
    const completeTimer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 2800);

    return () => {
      clearTimeout(phase1Timer);
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      clearTimeout(phase4Timer);
      clearTimeout(completeTimer);
    };
  }, []);

  const styles = {
    container: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,8,0.95)',
      overflow: 'hidden',
    },
    imagesWrapper: {
      position: 'relative',
      width: '100%',
      height: '300px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    babelImage: {
      maxWidth: '90%',
      width: '450px',
      height: 'auto',
    },
    lexiconImage: {
      maxWidth: '90%',
      width: '400px',
      height: 'auto',
    },
    combinedTitle: {
      maxWidth: '90%',
      width: '600px',
      height: 'auto',
    },
  };

  // Animation variants for BABEL (from left)
  const babelVariants = {
    initial: { x: '-100vw', opacity: 0.8 },
    moving: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    collision: {
      x: 10,
      transition: { duration: 0.05 }
    },
    settle: {
      x: 0,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    fadeOut: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  // Animation variants for "The Lexicon War" (from right)
  const lexiconVariants = {
    initial: { x: '100vw', opacity: 0.8 },
    moving: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    collision: {
      x: -10,
      transition: { duration: 0.05 }
    },
    settle: {
      x: 0,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    fadeOut: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  const getBabelState = () => {
    if (phase === 0) return 'initial';
    if (phase === 1) return 'moving';
    if (phase === 2) return 'collision';
    if (phase === 3) return 'settle';
    return 'fadeOut';
  };

  const getLexiconState = () => {
    if (phase === 0) return 'initial';
    if (phase === 1) return 'moving';
    if (phase === 2) return 'collision';
    if (phase === 3) return 'settle';
    return 'fadeOut';
  };

  return (
    <div style={styles.container}>
      {/* Spark effects */}
      <SparkBurst 
        active={showSparks} 
        centerX={screenCenter.x} 
        centerY={screenCenter.y} 
      />
      
      {/* Collision flash */}
      <CollisionFlash active={phase === 2} />
      
      {/* Shockwave */}
      <Shockwave 
        active={phase === 2} 
        centerX={screenCenter.x} 
        centerY={screenCenter.y} 
      />

      <div style={styles.imagesWrapper}>
        {/* Separate images that collide */}
        {phase < 4 && (
          <>
            <motion.img
              src="/images/babel.png"
              alt="BABEL"
              style={styles.babelImage}
              variants={babelVariants}
              initial="initial"
              animate={getBabelState()}
            />
            <motion.img
              src="/images/the-lexicon-war.png"
              alt="The Lexicon War"
              style={{ ...styles.lexiconImage, marginTop: '-10px' }}
              variants={lexiconVariants}
              initial="initial"
              animate={getLexiconState()}
            />
          </>
        )}

        {/* Combined title that fades in after collision */}
        {phase >= 4 && (
          <motion.img
            src="/images/babel-title.png"
            alt="BABEL: The Lexicon War"
            style={styles.combinedTitle}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
      </div>

      {/* Ambient glow during collision */}
      <AnimatePresence>
        {phase >= 2 && phase < 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(0,255,204,0.15) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
