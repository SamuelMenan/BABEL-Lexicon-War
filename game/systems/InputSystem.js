// Captura global de teclado — no depende de <input> HTML enfocado

import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';

const BLOCKED_KEYS = new Set([
  'Tab', 'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'Escape', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
]);

export class InputSystem {
  constructor() {
    this._active  = false;
    this._handler = this._onKeyDown.bind(this);
  }

  init() {
    document.addEventListener('keydown', this._handler);
    this._active = true;
  }

  destroy() {
    document.removeEventListener('keydown', this._handler);
    this._active = false;
  }

  // update() no hace nada — el sistema es puramente reactivo a eventos
  update() {}

  _onKeyDown(e) {
    if (!this._active) return;

    const isDeleteKey =
      e.key === 'Delete' ||
      e.key === 'Del' ||
      e.key === 'Supr' ||
      e.code === 'Delete' ||
      e.keyCode === 46;

    if (isDeleteKey) {
      e.preventDefault();
      EventBus.emit(EventTypes.DEBUG_FORCE_PLAYER_DEATH);
      return;
    }

    // Prevenir comportamiento del navegador en teclas relevantes al juego
    if (e.key === 'Backspace' || e.key === ' ') e.preventDefault();

    if (BLOCKED_KEYS.has(e.key)) return;

    // Sin copy-paste
    if (e.ctrlKey || e.metaKey) return;

    if (e.key === 'Backspace') {
      EventBus.emit(EventTypes.KEY_BACKSPACE);
      return;
    }

    // Solo caracteres imprimibles (largo 1)
    if (e.key.length === 1) {
      EventBus.emit(EventTypes.KEY_TYPED, {
        key:       e.key,
        timestamp: performance.now(),
      });
    }
  }
}
