// Decide qué tutorial mostrar y orquesta gate landing→tutorial→countdown.
// Inicializa una vez desde app/main.jsx.

import { Bridge } from './bridge.js';
import { EventBus } from './events.js';
import { EventTypes } from './eventTypes.js';
import { hasSeenTutorial, markTutorialSeen, getAllSeen } from './tutorialFlags.js';

let _initialized = false;
let _firstEntryByMode = { combat: true, racing: true };

function syncSeenToBridge() {
  Bridge.setState({ tutorialsSeen: { ...getAllSeen() } });
}

function maybeStartTutorial(id, onSkipOrDone) {
  if (hasSeenTutorial(id)) { onSkipOrDone?.(); return false; }
  Bridge.commands.startTutorial(id);
  const offDone = EventBus.on(EventTypes.TUTORIAL_COMPLETED, (p) => {
    if (p?.id !== id) return;
    offDone(); offSkip();
    markTutorialSeen(id);
    syncSeenToBridge();
    onSkipOrDone?.();
  });
  const offSkip = EventBus.on(EventTypes.TUTORIAL_SKIPPED, (p) => {
    if (p?.id !== id) return;
    offDone(); offSkip();
    markTutorialSeen(id);
    syncSeenToBridge();
    onSkipOrDone?.();
  });
  return true;
}

export function initTutorialController() {
  if (_initialized) return;
  _initialized = true;
  syncSeenToBridge();

  // Landing → tutorial → countdown (combat / racing)
  EventBus.on(EventTypes.DEPLOYMENT_ANIMATION_COMPLETE, ({ mode } = {}) => {
    if (mode !== 'combat' && mode !== 'racing') return;
    Bridge.setState({ deploymentPhase: 'tutorial' });

    // Skip tutorial on retry within session
    if (!_firstEntryByMode[mode]) {
      EventBus.emit(EventTypes.START_COUNTDOWN, { mode });
      return;
    }
    _firstEntryByMode[mode] = false;

    maybeStartTutorial(mode, () => {
      EventBus.emit(EventTypes.START_COUNTDOWN, { mode });
    });
  });

  // Hangar tutorial — al abrir selección de nave
  EventBus.on(EventTypes.SHIP_SELECTION_OPENED, () => {
    // Pequeño delay para que cámara hangar estabilice antes del modal
    setTimeout(() => { maybeStartTutorial('hangar'); }, 500);
  });

  // Standalone typing tutorial (lanzado desde menú)
  // Expuesto vía Bridge.commands.startTutorial('typing')

  // Reset state on game over (permite mostrar tutorial otra vez si jugador resetea perfil mid-session)
  EventBus.on(EventTypes.PROFILE_RESET, () => {
    _firstEntryByMode = { combat: true, racing: true };
    syncSeenToBridge();
  });

}
