import React from 'react';
import useTranslation from '@shared/i18n/useTranslation.js';

// HUD flotante mostrando stats live del rival online (fase 2 simple, sin
// flecha 3D todavia). Renderiza arriba-derecha bajo r-topright.
export default function OnlineOpponentHud({ stats, opponentPilot, opponentShip, connection }) {
  const { t } = useTranslation();

  if (connection === 'lost') {
    return (
      <div className="online-opp online-opp--lost">
        <div className="online-opp__label">{t("hud.racing.opponentDisconnected")}</div>
        <div className="online-opp__sub">{t("hud.racing.autoWin")}</div>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="online-opp">
        <div className="online-opp__label">{t("hud.common.rival")} · {(opponentPilot || '—').toUpperCase()}</div>
        <div className="online-opp__sub">{t("hud.racing.waitingData")}</div>
      </div>
    );
  }
  const { avgWpm = 0, distance = 0, phrasesDone = 0, accuracy = 0 } = stats;
  return (
    <div className="online-opp">
      <div className="online-opp__label">{t("hud.common.rival")} · {(opponentPilot || '—').toUpperCase()}</div>
      <div className="online-opp__row">
        <span className="online-opp__num">{Math.round(avgWpm)}</span>
        <span className="online-opp__micro">{t("hud.common.wpm")}</span>
      </div>
      <div className="online-opp__row online-opp__row--sub">
        <span>{distance}/500 m</span>
        <span>·</span>
        <span>{phrasesDone} {t("hud.racing.phrasesShort")}</span>
        <span>·</span>
        <span>{Math.round(accuracy)}%</span>
      </div>
    </div>
  );
}
