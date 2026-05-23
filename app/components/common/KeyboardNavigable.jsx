// Wrapper de navegación por teclado para listas/menús.
// Maneja focus interno, flechas, Enter/Space activar, Escape cancelar, 1-9 jump.

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Props:
 *  - items: array<any>          — datos arbitrarios pasados al render fn
 *  - children: (item, ctx) => ReactNode  donde ctx = { focused, index, activate }
 *  - orientation: 'vertical' | 'horizontal' (default 'vertical')
 *  - onActivate(item, index)    — Enter / Space / click
 *  - onCancel()                 — Escape
 *  - initialIndex: number       — default 0
 *  - allowNumberJump: boolean   — habilita 1–9 (default true)
 *  - className: string
 *  - autoFocus: boolean         — default true
 */
export default function KeyboardNavigable({
  items,
  children,
  orientation = 'vertical',
  onActivate,
  onCancel,
  initialIndex = 0,
  allowNumberJump = true,
  className = '',
  autoFocus = true,
}) {
  const [focusIdx, setFocusIdx] = useState(initialIndex);
  const rootRef = useRef(null);

  useEffect(() => {
    if (autoFocus && rootRef.current) rootRef.current.focus();
  }, [autoFocus]);

  const move = useCallback((delta) => {
    setFocusIdx((i) => {
      const n = items.length;
      if (n === 0) return 0;
      return (i + delta + n) % n;
    });
  }, [items.length]);

  const activate = useCallback((idx = focusIdx) => {
    const item = items[idx];
    if (item == null) return;
    onActivate?.(item, idx);
  }, [items, focusIdx, onActivate]);

  const onKeyDown = (e) => {
    const k = e.key;
    const prev = orientation === 'vertical' ? 'ArrowUp'   : 'ArrowLeft';
    const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

    if (k === prev)       { e.preventDefault(); move(-1); }
    else if (k === next)  { e.preventDefault(); move(1); }
    else if (k === 'Home'){ e.preventDefault(); setFocusIdx(0); }
    else if (k === 'End') { e.preventDefault(); setFocusIdx(items.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); activate(); }
    else if (k === 'Escape') { e.preventDefault(); onCancel?.(); }
    else if (allowNumberJump && /^[1-9]$/.test(k)) {
      const n = parseInt(k, 10) - 1;
      if (n < items.length) { e.preventDefault(); setFocusIdx(n); activate(n); }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`kbnav ${className}`}
      role="listbox"
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ outline: 'none' }}
    >
      {items.map((item, i) =>
        children(item, {
          focused: i === focusIdx,
          index: i,
          activate: () => activate(i),
          setFocus: () => setFocusIdx(i),
        })
      )}
    </div>
  );
}
