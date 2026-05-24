import React from 'react';
import { acceptRematch, declineRematch } from '../../../services/online/rematchCoordinator.js';

// Modal global renderizado desde App.jsx — debe aparecer encima de MatchResult.
// Recibe invite del Bridge state (onlinePendingInvite).
export default function RematchInviteModal({ invite }) {
  if (!invite) return null;
  return (
    <div className="rematch-invite" role="dialog" aria-modal="true">
      <div className="rematch-invite__panel">
        <div className="rematch-invite__title">REVANCHA</div>
        <div className="rematch-invite__msg">
          {(invite.fromPilot || 'rival').toUpperCase()} propone revancha.
        </div>
        <div className="rematch-invite__actions">
          <button
            type="button"
            className="rematch-invite__btn rematch-invite__btn--accept"
            onClick={() => acceptRematch()}
          >Aceptar</button>
          <button
            type="button"
            className="rematch-invite__btn"
            onClick={() => declineRematch()}
          >Rechazar</button>
        </div>
      </div>
    </div>
  );
}
