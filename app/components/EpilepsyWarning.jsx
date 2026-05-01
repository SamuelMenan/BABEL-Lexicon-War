import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const warningColor = "#ffcc00";

export default function EpilepsyWarning({ onAccept, autoSkipAfter = 10 }) {
  const [countdown, setCountdown] = useState(autoSkipAfter);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    // Enable skip after 2 seconds
    const skipTimer = setTimeout(() => setCanSkip(true), 2000);

    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(skipTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      onAccept();
    }
  }, [countdown, onAccept]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000008",
        }}
      >
        {/* Subtle background pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `radial-gradient(circle at 50% 50%, ${warningColor} 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Warning content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            position: "relative",
            zIndex: 10,
            margin: "0 1rem",
            maxWidth: "32rem",
            textAlign: "center",
          }}
        >
          {/* Warning icon */}
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            style={{
              marginBottom: "2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ position: "relative" }}>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  filter: "blur(24px)",
                  backgroundColor: warningColor,
                }}
              />
              <div
                style={{
                  position: "relative",
                  borderRadius: "50%",
                  border: `2px solid ${warningColor}`,
                  background: "#000008",
                  padding: "1.5rem",
                }}
              >
                <AlertTriangle
                  style={{ width: 48, height: 48, color: warningColor }}
                />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginBottom: "1rem",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "1.5rem",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: warningColor,
            }}
          >
            Advertencia de Epilepsia
          </motion.h1>

          {/* Warning text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{ marginBottom: "2rem" }}
          >
            <p
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: "#888",
                marginBottom: "1rem",
              }}
            >
              Este juego contiene efectos visuales que pueden incluir patrones
              de luz intermitente y destellos que podrian provocar convulsiones
              en personas con epilepsia fotosensible.
            </p>
            <p
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: "#888",
                marginBottom: "1rem",
              }}
            >
              Si usted o alguien de su familia tiene antecedentes de epilepsia,
              consulte a un medico antes de jugar.
            </p>
            <p
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.75rem",
                lineHeight: 1.5,
                color: "#555",
              }}
            >
              Si experimenta mareos, alteracion de la vision, contracciones
              musculares, desorientacion o cualquier tipo de movimiento
              involuntario, deje de jugar inmediatamente.
            </p>
          </motion.div>

          {/* Accept button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: canSkip ? 1 : 0.5 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={onAccept}
              disabled={!canSkip}
              style={{
                position: "relative",
                overflow: "hidden",
                border: `1px solid ${warningColor}`,
                background: "transparent",
                padding: "0.75rem 2rem",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.875rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: warningColor,
                cursor: canSkip ? "pointer" : "not-allowed",
                opacity: canSkip ? 1 : 0.3,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (canSkip) {
                  e.target.style.background = `${warningColor}22`;
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
              }}
            >
              {canSkip ? (
                "Entiendo y acepto continuar"
              ) : (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      border: `2px solid ${warningColor}`,
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Leyendo...
                </span>
              )}
            </button>

            {/* Auto-continue countdown */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              style={{
                marginTop: "1rem",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.75rem",
                color: "#444",
              }}
            >
              Continua automaticamente en {countdown}s
            </motion.p>
          </motion.div>

          {/* Bottom decoration */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            style={{
              margin: "2rem auto 0",
              height: 1,
              width: "12rem",
              transformOrigin: "center",
              background: `linear-gradient(90deg, transparent, ${warningColor}44, transparent)`,
            }}
          />
        </motion.div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
