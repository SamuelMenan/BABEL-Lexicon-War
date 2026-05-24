import React from 'react';

// HUD flotante mostrando stats live del rival online (fase 2 simple, sin
// flecha 3D todavia). Renderiza arriba-derecha bajo r-topright.
export default function OnlineOpponentHud({ stats, opponentPilot, opponentShip, connection }) {
  if (connection === 'lost') {
    return (
      <div className="online-opp online-opp--lost">
        <div className="online-opp__label">RIVAL · DESCONECTADO</div>
        <div className="online-opp__sub">ganaras automaticamente</div>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="online-opp">
        <div className="online-opp__label">RIVAL · {(opponentPilot || '—').toUpperCase()}</div>
        <div className="online-opp__sub">esperando datos...</div>
      </div>
    );
  }
  const { avgWpm = 0, distance = 0, phrasesDone = 0, accuracy = 0 } = stats;
  return (
    <div className="online-opp">
      <div className="online-opp__label">RIVAL · {(opponentPilot || '—').toUpperCase()}</div>
      <div className="online-opp__row">
        <span className="online-opp__num">{Math.round(avgWpm)}</span>
        <span className="online-opp__micro">WPM</span>
      </div>
      <div className="online-opp__row online-opp__row--sub">
        <span>{distance}/500 m</span>
        <span>·</span>
        <span>{phrasesDone} fr</span>
        <span>·</span>
        <span>{Math.round(accuracy)}%</span>
      </div>
    </div>
  );
}
