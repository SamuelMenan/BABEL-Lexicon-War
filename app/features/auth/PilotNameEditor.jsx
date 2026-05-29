import React, { useEffect, useState } from 'react';
import { updateDisplayName } from '../../../game/services/supabase/auth.js';
import { KeybindService } from '../../../shared/keybindService.js';

export default function PilotNameEditor({ initial = '', onSaved, onClose }) {
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

  useEffect(() => {
    KeybindService.pushScope('modal');
    const offCancel  = KeybindService.register('modal', 'CANCEL',  () => onClose?.());
    const offConfirm = KeybindService.register('modal', 'CONFIRM', () => { if (name.trim()) save(); });
    return () => { offCancel(); offConfirm(); KeybindService.popScope('modal'); };
  }, [name, onClose]);

  return (
    <div className="pilot-name-editor">
      <input
        type="text"
        className="pilot-name-editor__input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (name.trim()) save(); } }}
        maxLength={32}
        placeholder="Nombre de piloto"
        autoFocus
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
