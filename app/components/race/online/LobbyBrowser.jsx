import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../../common/Icon.jsx';
import { loadProfile } from '../../../../shared/playerProfile.js';
import {
  createRoom, joinRoomById, joinRoomByCode, listPublicRooms, cleanupStaleRooms,
} from '../../../../game/services/supabase/rooms.js';
import useTranslation from '../../../../shared/i18n/useTranslation.js';

// Pantalla principal del modo online (fase 1):
//   - lista salas publicas
//   - crear sala (publica o privada con codigo 4 digitos)
//   - unirse por codigo
// Cuando entra/crea sala llama onEnterRoom(roomId, role).
export default function LobbyBrowser({ onEnterRoom, onClose }) {
  const { t } = useTranslation();
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createPrivate, setCreatePrivate] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const list = await listPublicRooms();
      setRooms(list);
    } catch (e) {
      setError(e?.message || t('race.lobby.errors.load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cleanup explicito al abrir lobby + refresh + poll cada 5s.
    cleanupStaleRooms().catch(() => {});
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleCreate = async () => {
    setBusy(true); setError('');
    try {
      const profile = loadProfile();
      const { roomId } = await createRoom({ playerId: profile.playerId, displayName: profile.displayName, isPrivate: createPrivate });
      onEnterRoom?.(roomId, 'host');
    } catch (e) {
      setError(e?.message || t('race.lobby.errors.create'));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (roomId) => {
    setBusy(true); setError('');
    try {
      const profile = loadProfile();
      await joinRoomById({ roomId, playerId: profile.playerId, displayName: profile.displayName });
      onEnterRoom?.(roomId, 'guest');
    } catch (e) {
      setError(e?.message || t('race.lobby.errors.join'));
    } finally {
      setBusy(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!/^\d{4}$/.test(codeInput)) { setError(t('race.lobbyExtra.codeLenError')); return; }
    setBusy(true); setError('');
    try {
      const profile = loadProfile();
      const roomId = await joinRoomByCode({ code: codeInput, playerId: profile.playerId, displayName: profile.displayName });
      onEnterRoom?.(roomId, 'guest');
    } catch (e) {
      setError(e?.message || t('race.lobby.errors.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lobby" role="dialog" aria-modal="true">
      <div className="lobby__panel">
        <header className="lobby__header">
          <span className="lobby__label">◈ {t('race.lobby.label')}</span>
          <button type="button" className="lobby__close" onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={16} /></button>
        </header>

        <div className="lobby__actions">
          <button type="button" className="lobby__btn lobby__btn--primary" onClick={() => setShowCreate(true)} disabled={busy}>
            {t('race.lobby.createRoom')}
          </button>
          <div className="lobby__code-input">
            <input
              type="text"
              maxLength={4}
              placeholder={t('race.lobby.codePlaceholder')}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={busy}
            />
            <button type="button" className="lobby__btn" onClick={handleJoinByCode} disabled={busy || codeInput.length !== 4}>
              {t('race.lobby.joinByCode')}
            </button>
          </div>
          <button type="button" className="lobby__btn lobby__btn--ghost" onClick={refresh} disabled={loading}>
            {t('race.lobby.refresh')}
          </button>
        </div>

        {error && <div className="lobby__error">{error}</div>}

        <div className="lobby__list">
          {loading && <div className="lobby__state">{t('race.lobby.loadingRooms')}</div>}
          {!loading && rooms.length === 0 && (
            <div className="lobby__state">{t('race.lobby.noRooms')}</div>
          )}
          {!loading && rooms.map((r) => (
            <div key={r.id} className="lobby__row">
              <div className="lobby__row-main">
                <div className="lobby__row-host">{r.host_name || t('race.lobbyExtra.anonymous')}</div>
                <div className="lobby__row-sub">
                  {t('race.lobbyExtra.createdAt', { when: timeAgo(r.created_at, t) })}
                </div>
              </div>
              <button type="button" className="lobby__btn lobby__btn--primary" onClick={() => handleJoin(r.id)} disabled={busy}>
                {t('race.lobby.joinByCode')}
              </button>
            </div>
          ))}
        </div>

        {showCreate && (
          <div className="lobby__create-modal" onClick={() => setShowCreate(false)}>
            <div className="lobby__create-panel" onClick={(e) => e.stopPropagation()}>
              <h3>{t('race.lobby.createTitle')}</h3>
              <label className="lobby__create-row">
                <input
                  type="checkbox"
                  checked={createPrivate}
                  onChange={(e) => setCreatePrivate(e.target.checked)}
                />
                <span>{t('race.lobby.privateLabel')}</span>
              </label>
              <div className="lobby__create-actions">
                <button type="button" className="lobby__btn lobby__btn--ghost" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
                <button type="button" className="lobby__btn lobby__btn--primary" onClick={handleCreate} disabled={busy}>
                  {t('race.lobbyExtra.create')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso, t) {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return t('race.lobbyExtra.secondsAgo', { n: Math.floor(sec) });
  return t('race.lobbyExtra.minutesAgo', { n: Math.floor(sec / 60) });
}
