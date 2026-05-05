import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bridge } from '../../shared/bridge.js';
import { GAME_MODES } from '../../shared/constants.js';
import TitleAnimation from './TitleAnimation.jsx';
import AnimatedBackground from './AnimatedBackground.jsx';

// Screen states
const SCREENS = {
  TITLE_ANIMATION: 'titleAnimation',
  START_SCREEN: 'startScreen',
  MAIN_MENU: 'mainMenu',
  MODE_SELECT: 'modeSelect',
};

export default function MainMenu() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.TITLE_ANIMATION);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (currentScreen === SCREENS.MAIN_MENU) {
      // Trigger menu items animation after a short delay
      const timer = setTimeout(() => setMenuVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setMenuVisible(false);
    }
  }, [currentScreen]);

  const start = (mode) => Bridge.commands.startGame(mode);

  // Title Animation Screen
  if (currentScreen === SCREENS.TITLE_ANIMATION) {
    return <TitleAnimation onComplete={() => setCurrentScreen(SCREENS.START_SCREEN)} />;
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.overlay} />
      
      <AnimatePresence mode="wait">
        {/* Start Screen */}
        {currentScreen === SCREENS.START_SCREEN && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={styles.contentWrapper}
          >
            <motion.img
              src="/images/babel-title.png"
              alt="BABEL: The Lexicon War"
              style={styles.titleImage}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            />
            <motion.button
              style={styles.startButton}
              onClick={() => setCurrentScreen(SCREENS.MAIN_MENU)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              whileHover={{ scale: 1.05, textShadow: '0 0 20px #00ffcc' }}
              whileTap={{ scale: 0.98 }}
            >
              Start Game
            </motion.button>
          </motion.div>
        )}

        {/* Main Menu */}
        {currentScreen === SCREENS.MAIN_MENU && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={styles.menuWrapper}
          >
            {/* Top Bar */}
            <div style={styles.topBar}>
              <motion.button
                style={styles.backButton}
                onClick={() => setCurrentScreen(SCREENS.START_SCREEN)}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div style={styles.backIcon}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#00ffcc" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </div>
                <span>BACK</span>
              </motion.button>
              
              <motion.div
                style={styles.titleBar}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <h1 style={styles.menuTitle}>SINGLE PLAYER</h1>
                <p style={styles.menuSubtitle}>CORE SYSTEMS PROTOCOL: ACTIVE</p>
              </motion.div>
              
              <motion.div
                style={styles.scoreBox}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div style={styles.starIcon}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="#00ffcc">
                    <polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9" />
                  </svg>
                </div>
                <div style={styles.scoreText}>
                  <span style={styles.scoreLabel}>TOTAL</span>
                  <span style={styles.scoreValue}>0/330</span>
                </div>
              </motion.div>
            </div>

            {/* Menu Items */}
            <div style={styles.menuItemsContainer}>
              {[
                { label: 'Credits', delay: 0.3, onClick: () => {} },
                { label: 'Mode', delay: 0.45, onClick: () => setCurrentScreen(SCREENS.MODE_SELECT) },
                { label: 'Settings', delay: 0.6, onClick: () => {} },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  style={styles.menuItemWrapper}
                  initial={{ x: 300, opacity: 0 }}
                  animate={menuVisible ? { x: 0, opacity: 1 } : { x: 300, opacity: 0 }}
                  transition={{ 
                    delay: item.delay, 
                    duration: 0.5,
                    type: 'spring',
                    stiffness: 100,
                    damping: 15
                  }}
                >
                  <motion.button
                    style={styles.menuItem}
                    onClick={item.onClick}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div style={styles.portalOuter}>
                      <div style={styles.portalInner}>
                        <span style={styles.menuItemLabel}>{item.label}</span>
                      </div>
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Mode Select */}
        {currentScreen === SCREENS.MODE_SELECT && (
          <motion.div
            key="modeSelect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={styles.menuWrapper}
          >
            {/* Top Bar */}
            <div style={styles.topBar}>
              <motion.button
                style={styles.backButton}
                onClick={() => setCurrentScreen(SCREENS.MAIN_MENU)}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div style={styles.backIcon}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#00ffcc" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </div>
                <span>BACK</span>
              </motion.button>
              
              <motion.div
                style={styles.titleBar}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <h1 style={styles.menuTitle}>SELECT MODE</h1>
                <p style={styles.menuSubtitle}>CHOOSE YOUR BATTLE TYPE</p>
              </motion.div>
              
              <div style={{ width: '180px' }} />
            </div>

            {/* Mode Options */}
            <div style={styles.modeContainer}>
              <motion.button
                style={styles.modeCard}
                onClick={() => start(GAME_MODES.COMBAT)}
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,255,204,0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={styles.modeIcon}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#00ffcc" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    <circle cx="12" cy="12" r="3" fill="#00ffcc" />
                  </svg>
                </div>
                <h2 style={styles.modeTitle}>COMBAT</h2>
                <p style={styles.modeDesc}>Destroy enemy swarms with precision typing</p>
              </motion.button>

              <motion.button
                style={{ ...styles.modeCard, borderColor: '#ff4466' }}
                onClick={() => start(GAME_MODES.RACING)}
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,68,102,0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{ ...styles.modeIcon }}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ff4466" strokeWidth="1.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <h2 style={{ ...styles.modeTitle, color: '#ff4466' }}>RACING</h2>
                <p style={styles.modeDesc}>Outpace your opponents in a typing race</p>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    fontFamily: "'Orbitron', sans-serif",
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,10,0.6)',
    zIndex: 1,
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '2rem',
  },
  titleImage: {
    maxWidth: '90%',
    width: '550px',
    height: 'auto',
    filter: 'drop-shadow(0 0 30px rgba(0,255,204,0.3))',
  },
  startButton: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '1.4rem',
    color: '#00ffcc',
    background: 'transparent',
    border: '2px solid transparent',
    padding: '1rem 2rem',
    cursor: 'pointer',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(0,255,204,0.5)',
    transition: 'all 0.3s ease',
  },
  menuWrapper: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '1.5rem',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '2rem',
  },
  backButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, rgba(0,40,50,0.9) 0%, rgba(0,20,30,0.9) 100%)',
    border: '2px solid #00ffcc',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    cursor: 'pointer',
    color: '#00ffcc',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
    minWidth: '100px',
  },
  backIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBar: {
    background: 'linear-gradient(135deg, rgba(0,40,50,0.9) 0%, rgba(0,20,30,0.9) 100%)',
    border: '2px solid #00ffcc',
    borderRadius: '8px',
    padding: '1rem 2rem',
    textAlign: 'center',
    flex: 1,
    maxWidth: '500px',
  },
  menuTitle: {
    color: '#00ffcc',
    fontSize: '1.6rem',
    margin: 0,
    letterSpacing: '0.15em',
    textShadow: '0 0 15px rgba(0,255,204,0.5)',
  },
  menuSubtitle: {
    color: '#4a9999',
    fontSize: '0.75rem',
    margin: '0.5rem 0 0 0',
    letterSpacing: '0.2em',
  },
  scoreBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'linear-gradient(135deg, rgba(0,40,50,0.9) 0%, rgba(0,20,30,0.9) 100%)',
    border: '2px solid #00ffcc',
    borderRadius: '8px',
    padding: '0.75rem 1.25rem',
  },
  starIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  scoreText: {
    display: 'flex',
    flexDirection: 'column',
  },
  scoreLabel: {
    color: '#4a9999',
    fontSize: '0.7rem',
    letterSpacing: '0.1em',
  },
  scoreValue: {
    color: '#00ffcc',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  menuItemsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '2rem',
    flex: 1,
    paddingBottom: '4rem',
  },
  menuItemWrapper: {
    display: 'flex',
    justifyContent: 'center',
  },
  menuItem: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  portalOuter: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(0,180,180,0.3) 0%, rgba(0,80,100,0.2) 100%)',
    border: '4px solid #00ffcc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 30px rgba(0,255,204,0.3), inset 0 0 40px rgba(0,255,204,0.1)',
    position: 'relative',
  },
  portalInner: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,30,40,0.9) 0%, rgba(0,10,20,0.95) 100%)',
    border: '2px solid rgba(0,255,204,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    color: '#ffffff',
    fontSize: '1.2rem',
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: '0.1em',
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
  },
  modeContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '3rem',
    flex: 1,
    paddingBottom: '4rem',
  },
  modeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    background: 'linear-gradient(135deg, rgba(0,40,50,0.9) 0%, rgba(0,20,30,0.95) 100%)',
    border: '3px solid #00ffcc',
    borderRadius: '16px',
    padding: '2.5rem 3rem',
    cursor: 'pointer',
    minWidth: '250px',
    transition: 'all 0.3s ease',
  },
  modeIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
  },
  modeTitle: {
    color: '#00ffcc',
    fontSize: '1.5rem',
    margin: 0,
    letterSpacing: '0.2em',
    textShadow: '0 0 15px rgba(0,255,204,0.5)',
  },
  modeDesc: {
    color: '#888',
    fontSize: '0.85rem',
    margin: 0,
    textAlign: 'center',
    maxWidth: '200px',
    lineHeight: 1.4,
  },
};
