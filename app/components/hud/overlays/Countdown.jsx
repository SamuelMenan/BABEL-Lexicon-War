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
  useEffect(() => {
    if (!countdownActive) {
      lastTickRef.current = null;
      goFiredRef.current = false;
      return;
    }
    const n = typeof countdown === 'number' ? Math.max(0, Math.ceil(countdown)) : null;
    if (n == null) return;
    if (n > 0 && lastTickRef.current !== n) {
      lastTickRef.current = n;
      playSfx('countdown.tick');
    } else if (n === 0 && !goFiredRef.current) {
      goFiredRef.current = true;
      playSfx('countdown.go');
      // Race mode → tambien dispara racestart.start al final del countdown.
      try {
        const mode = Bridge.peekState?.()?.gameMode;
        if (mode === 'racing') playSfx('racestart.start');
      } catch (e) {}
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
