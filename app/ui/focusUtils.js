// Helpers de foco para modales. Sin dependencias.

export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export function getFocusables(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTORS))
    .filter(el => {
      const isVisible = el.offsetParent !== null || el.getClientRects().length > 0;
      return isVisible || el === document.activeElement;
    });
}

export function focusFirstFocusable(root) {
  if (!root) return false;
  // Preferir [autofocus] si existe.
  const preferred = root.querySelector('[autofocus]:not([disabled])');
  if (preferred) { try { preferred.focus(); return true; } catch { /* ignore */ } }
  const list = getFocusables(root);
  if (list.length === 0) return false;
  try { list[0].focus(); return true; } catch { return false; }
}

// Atrapa Tab/Shift+Tab dentro de root. Devuelve handler para addEventListener.
export function createTrapHandler(root) {
  return function trap(e) {
    if (e.key !== 'Tab') return;
    const focusables = getFocusables(root);
    if (focusables.length === 0) { e.preventDefault(); return; }
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };
}
