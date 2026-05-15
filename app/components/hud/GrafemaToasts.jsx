import React, { useEffect, useState } from 'react';
import { EventBus } from '../../../shared/events.js';
import { EventTypes } from '../../../shared/eventTypes.js';

const TOAST_TTL_MS = 1400;
const MAX_VISIBLE  = 6;

export default function GrafemaToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    let counter = 0;
    const unsub = EventBus.on(EventTypes.GRAFEMAS_AWARDED, ({ amount, source }) => {
      if (!amount) return;
      const id = ++counter;
      setToasts(list => {
        const next = [...list, { id, amount, source }];
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
      });
      setTimeout(() => {
        setToasts(list => list.filter(t => t.id !== id));
      }, TOAST_TTL_MS);
    });
    return unsub;
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="grafema-toasts">
      {toasts.map(t => (
        <span key={t.id} className="grafema-toasts__item">+{t.amount} ₲</span>
      ))}
    </div>
  );
}
