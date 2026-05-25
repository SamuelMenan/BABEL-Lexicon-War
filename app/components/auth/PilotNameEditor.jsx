import React, { useState } from 'react';
import { updateDisplayName } from '../../../game/services/supabase/auth.js';

export default function PilotNameEditor({ initial = '', onSaved }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  async function save() {
    setMsg(null); setErr(null);
    if (!name.trim()) { setErr('Nombre vacio.'); return; }
    setBusy(true);
    const res = await updateDisplayName(name.trim());
    setBusy(false);
    if (!res.ok) { setErr(res.error?.message || 'No se pudo guardar.'); return; }
    setMsg(res.skipped ? 'Guardado local (sin Supabase).' : 'Guardado.');
    onSaved?.(name.trim());
  }

  return (
    <div className="pilot-name-editor">
      <input
        type="text"
        className="pilot-name-editor__input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={32}
        placeholder="Nombre de piloto"
      />
      <button
        type="button"
        className="pilot-name-editor__btn"
        onClick={save}
        disabled={busy}
      >
        {busy ? '…' : 'Guardar'}
      </button>
      {err && <span className="pilot-name-editor__err">{err}</span>}
      {msg && <span className="pilot-name-editor__msg">{msg}</span>}
    </div>
  );
}
