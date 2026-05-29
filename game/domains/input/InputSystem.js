// Captura typing en gameplay. NO maneja teclas de accion (Escape, F-keys, debug).
// Service global (shared/services/keybindService.js) maneja todo lo demas.

import { EventBus } from '@shared/state/events.js';
import { EventTypes } from '@shared/state/eventTypes.js';
import { Bridge } from '@shared/state/bridge.js';

// Teclas que NUNCA emiten KEY_TYPED (modificadores, funcion, navegacion, debug).
// El service ya consume las que tienen action binding. Esta lista es defensa extra
// para teclas fisicas que el service no consume (ej. Shift/Tab) y no deben tipear.
const NON_TYPING_KEYS = new Set([
  'Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'Escape',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
  'Pause', 'ScrollLock', 'PrintScreen', 'ContextMenu',
  'Enter',
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

  update() {}

  _onKeyDown(e) {
    if (!this._active) return;
    // Bloqueo durante tutorial — input local de practica vive en React.
    if (Bridge.peekState().tutorialActive) return;
    // Si el service ya consumio la tecla (action binding), no tipear.
    if (e.defaultPrevented) return;
    // Bloquear modificadores combinados (sin copy-paste accidental).
    if (e.ctrlKey || e.metaKey) return;

    if (NON_TYPING_KEYS.has(e.key)) return;

    // Backspace → borrar caracter
    if (e.key === 'Backspace') {
      e.preventDefault();
      EventBus.emit(EventTypes.KEY_BACKSPACE);
      return;
    }

    // Space → typing (override de alias CONFIRM). En gameplay, space ES typing.
    if (e.key === ' ') e.preventDefault();

    // Solo caracteres imprimibles (length 1)
    if (e.key.length === 1) {
      EventBus.emit(EventTypes.KEY_TYPED, {
        key:       e.key,
        timestamp: performance.now(),
      });
    }
  }
}
