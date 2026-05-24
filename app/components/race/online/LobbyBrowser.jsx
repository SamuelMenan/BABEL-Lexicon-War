import React, { useCallback, useEffect, useState } from 'react';
import { loadProfile } from '../../../../shared/playerProfile.js';
import {
  createRoom, joinRoomById, joinRoomByCode, listPublicRooms,
} from '../../../services/supabase/rooms.js';
import { getShipsForHangar } from '../../../../shared/shopCatalog.js';

// Pantalla principal del modo online (fase 1):
//   - lista salas publicas
//   - crear sala (publica o privada con codigo 4 digitos)
//   - unirse por codigo
// Cuando entra/crea sala llama onEnterRoom(roomId, role).
export default function LobbyBrowser({ onEnterRoom, onClose }) {
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
      setError(e?.message || 'Error cargando salas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
      setError(e?.message || 'No se pudo crear sala');
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
      setError(e?.message || 'No se pudo unir');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!/^\d{4}$/.test(codeInput)) { setError('Codigo debe ser 4 digitos'); return; }
    setBusy(true); setError('');
    try {
      const profile = loadProfile();
      const roomId = await joinRoomByCode({ code: codeInput, playerId: profile.playerId, displayName: profile.displayName });
      onEnterRoom?.(roomId, 'guest');
    } catch (e) {
      setError(e?.message || 'Codigo invalido');
    } finally {
      setBusy(false);
    }
  };

  const findShipName = (id) => {
    const s = getShipsForHangar().find(x => x.id === id);
    return s?.name || id || '—';
  };

  return (
    <div className="lobby" role="dialog" aria-modal="true">
      <div className="lobby__panel">
        <header className="lobby__header">
          <span className="lobby__label">◈ LOBBY · CARRERAS EN LINEA</span>
          <button type="button" className="lobby__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="lobby__actions">
          <button type="button" className="lobby__btn lobby__btn--primary" onClick={() => setShowCreate(true)} disabled={busy}>
            + Crear sala
          </button>
          <div className="lobby__code-input">
            <input
              type="text"
              maxLength={4}
              placeholder="Codigo 4 digitos"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={busy}
            />
            <button type="button" className="lobby__btn" onClick={handleJoinByCode} disabled={busy || codeInput.length !== 4}>
              Unirse
            </button>
          </div>
          <button type="button" className="lobby__btn lobby__btn--ghost" onClick={refresh} disabled={loading}>
            ↻ Refrescar
          </button>
        </div>

        {error && <div className="lobby__error">{error}</div>}

        <div className="lobby__list">
          {loading && <div className="lobby__state">Cargando salas...</div>}
          {!loading && rooms.length === 0 && (
            <div className="lobby__state">Sin salas publicas. Crea una.</div>
          )}
          {!loading && rooms.map((r) => (
            <div key={r.id} className="lobby__row">
              <div className="lobby__row-main">
                <div className="lobby__row-host">{r.host_name || 'Anonimo'}</div>
                <div className="lobby__row-sub">
                  Nave: {findShipName(r.host_ship)} · creada {timeAgo(r.created_at)}
                </div>
              </div>
              <button type="button" className="lobby__btn lobby__btn--primary" onClick={() => handleJoin(r.id)} disabled={busy}>
                Unirse
              </button>
            </div>
          ))}
        </div>

        {showCreate && (
          <div className="lobby__create-modal" onClick={() => setShowCreate(false)}>
            <div className="lobby__create-panel" onClick={(e) => e.stopPropagation()}>
              <h3>Crear sala</h3>
              <label className="lobby__create-row">
                <input
                  type="checkbox"
                  checked={createPrivate}
                  onChange={(e) => setCreatePrivate(e.target.checked)}
                />
                <span>Privada (genera codigo 4 digitos)</span>
              </label>
              <div className="lobby__create-actions">
                <button type="button" className="lobby__btn lobby__btn--ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="button" className="lobby__btn lobby__btn--primary" onClick={handleCreate} disabled={busy}>
                  Crear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${Math.floor(sec)}s atras`;
  return `${Math.floor(sec / 60)}m atras`;
}
