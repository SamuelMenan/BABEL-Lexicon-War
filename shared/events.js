// Bus de eventos global — comunicación desacoplada entre motor y UI

const listeners = new Map();

export const EventBus = {
  /**
   * Suscribirse a un evento.
   * @param {string} type - EventTypes.*
   * @param {Function} handler - fn(payload)
   * @returns {Function} unsub — llama para cancelar suscripción
   */
  on(type, handler) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
    return () => listeners.get(type)?.delete(handler);
  },

  /**
   * Emitir evento a todos los suscriptores.
   * @param {string} type
   * @param {*} payload
   */
  emit(type, payload) {
    listeners.get(type)?.forEach(fn => fn(payload));
  },

  /**
   * Suscribirse una sola vez.
   */
  once(type, handler) {
    const unsub = this.on(type, (payload) => {
      handler(payload);
      unsub();
    });
    return unsub;
  },

  /**
   * Eliminar todos los listeners de un tipo (o todos si no se pasa tipo).
   */
  off(type) {
    if (type) listeners.delete(type);
    else listeners.clear();
  },
};
