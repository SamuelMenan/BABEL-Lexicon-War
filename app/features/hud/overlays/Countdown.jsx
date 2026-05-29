import React, { useEffect, useRef, useState } from "react";
import useTranslation from "../../../../shared/i18n/useTranslation.js";
import { Bridge } from "../../../../shared/bridge.js";
import { playSfx } from "../../../../shared/audioManager.js";

export default function Countdown({ countdown, countdownActive }) {
  const { t } = useTranslation();
  const [showGo, setShowGo] = useState(false);
  const prevActive = useRef(false);
  const wasActive = useRef(false);
  const lastTickRef = useRef(null);
  const goFiredRef = useRef(false);

  // SFX: tick por cada decremento entero > 0; go al llegar a 0 (una vez).
  // En carrera, React batchea setState({countdown:0}) + setState({countdownActive:false})
  // en un solo render → nunca se ve el frame con n===0 && active. Por eso detectamos
  // transicion active true→false como trigger alternativo del go.
  useEffect(() => {
    const fireGo = () => {
      if (goFiredRef.current) return;
      goFiredRef.current = true;
      playSfx('countdown.go');
      try {
        const mode = Bridge.peekState?.()?.gameMode;
        if (mode === 'racing') playSfx('racestart.start');
      } catch (e) {}
    };
    if (!countdownActive) {
      // Transicion: si veniamos de activo, dispara go (cubre el batch de race).
      if (prevActive.current) fireGo();
      lastTickRef.current = null;
      // No reseteamos goFiredRef aqui; se resetea al armar nuevo countdown abajo.
      return;
    }
    // Nuevo countdown armado — resetea flag go.
    if (!prevActive.current) goFiredRef.current = false;
    const n = typeof countdown === 'number' ? Math.max(0, Math.ceil(countdown)) : null;
    if (n == null) return;
    if (n > 0 && lastTickRef.current !== n) {
      lastTickRef.current = n;
      playSfx('countdown.tick');
    } else if (n === 0) {
      fireGo();
    }
  }, [countdown, countdownActive]);

  useEffect(() => {
    let timerId;
    if (countdownActive) wasActive.current = true;
    if (prevActive.current && !countdownActive && wasActive.current) {
      setShowGo(true);
      timerId = setTimeout(() => setShowGo(false), 900);
    }
    prevActive.current = countdownActive;
    return () => { if (timerId) clearTimeout(timerId); };
  }, [countdownActive]);

  if (!countdownActive && !showGo) return null;

  const engage = showGo || countdown === 0;
  const level = engage ? "red" : "yellow";
  const message = engage ? t("hud.overlays.starting") : t("hud.overlays.calibrating");
  const value = engage ? t("hud.overlays.go") : countdown > 0 ? String(countdown) : "";

  return (
    <div className={`precombat-overlay precombat-overlay-${level}`}>
      <div className={`precombat-frame precombat-frame-${level}`}>
        <span className="precombat-phase">{engage ? t("hud.overlays.engage") : t("hud.overlays.prepare")}</span>
        <span className={`precombat-value${engage ? " precombat-value-engage" : ""}`}>{value}</span>
        <span className="precombat-message">{message}</span>
      </div>
      <div className="precombat-scanline" />
      {engage && <div className="precombat-edge-flash" />}
    </div>
  );
}
