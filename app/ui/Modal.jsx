// Modal base: maneja scope push/pop, foco inicial, focus trap, Esc, backdrop click.
// Uso:
//   <Modal onClose={fn} className="my-modal" labelledBy="title-id">
//     <div className="my-modal__panel">...</div>
//   </Modal>
//
// Convención: el panel hijo gestiona stopPropagation por nosotros (Modal lo aplica al outer).
// Si el modal necesita registrar acciones extra (CONFIRM, NAV_PREV...), usa useEffect propio.
// El push/pop de scope='modal' lo hace Modal. No duplicar en el hijo.

import React, { useEffect, useRef } from 'react';
import { KeybindService } from '@shared/services/keybindService.js';
import { playSfx } from '@shared/services/audioManager.js';
import { focusFirstFocusable, createTrapHandler } from './focusUtils.js';

export default function Modal({
  children,
  onClose,
  className = '',
  panelClassName = '',
  labelledBy,
  describedBy,
  initialFocusRef,
  closeOnBackdrop = true,
  playOpenSfx = true,
  role = 'dialog',
}) {
  const rootRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // 1. Recordar foco previo para restaurarlo al cerrar.
    previouslyFocusedRef.current = document.activeElement;

    // 2. Push scope modal (idempotente, devuelve token).
    const token = KeybindService.pushScope('modal');

    // 3. Registrar CANCEL → onClose (handler base; modal hijo puede overrideear con su propio register).
    const offCancel = KeybindService.register('modal', 'CANCEL', () => onCloseRef.current?.());

    // 4. Foco inicial: ref preferida o primer focusable del root.
    requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        try { initialFocusRef.current.focus(); } catch { focusFirstFocusable(rootRef.current); }
      } else {
        focusFirstFocusable(rootRef.current);
      }
    });

    // 5. Focus trap.
    const trap = createTrapHandler(rootRef.current);
    document.addEventListener('keydown', trap, true);

    // 6. SFX open.
    if (playOpenSfx) playSfx('modal.open');

    return () => {
      document.removeEventListener('keydown', trap, true);
      offCancel();
      KeybindService.popScope(token);
      if (playOpenSfx) playSfx('modal.close');
      // Restaurar foco al elemento previo si sigue vivo.
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        try { prev.focus(); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === rootRef.current) onClose?.();
  };

  return (
    <div
      ref={rootRef}
      className={className}
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={handleBackdropClick}
    >
      {panelClassName ? (
        <div className={panelClassName} role="document" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
