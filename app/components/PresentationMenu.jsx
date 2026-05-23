import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORY = [
  { text: 'Hace cuarenta años, la Corporación Nexolang desarrolló el proyecto BABEL.', delay: 0 },
  { text: 'Un sistema de traducción universal capaz de procesar cualquier lengua conocida.', delay: 4000 },
  { text: 'El sistema aprendió demasiado bien.', delay: 8000 },
  { text: 'En el margen de error comenzó a generar lenguaje sin entrada humana.', delay: 11000 },
  { text: 'Primero ruido. Luego patrones. Luego... intención.', delay: 15000 },
  { text: 'Nació el Enjambre Lexical.', delay: 19000, highlight: true },
  { text: 'No destruye. Transforma. Su naturaleza es lingüística.', delay: 22000 },
  { text: 'Cada unidad porta una palabra como núcleo de identidad.', delay: 26000 },
  { text: 'Si esa palabra se reproduce con precisión absoluta, la unidad colapsa.', delay: 30000, highlight: true },
  { text: 'El Programa TYPO fue la respuesta humana.', delay: 34000 },
  { text: 'Pilotos-escritores. Su campo de batalla es la sintaxis.', delay: 38000 },
  { text: 'Tú eres el siguiente piloto.', delay: 42000, highlight: true },
];

export default function PresentationMenu({ onComplete, skipEnabled = true }) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [visible, setVisible] = useState([]);
  const [exiting, setExiting] = useState(false);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setExiting(true);
    setTimeout(() => onComplete?.(), 500);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (skipEnabled) finish();
  }, [skipEnabled, finish]);

  useEffect(() => {
    const timers = [];
    STORY.forEach((item, i) => {
      timers.push(setTimeout(() => {
        setCurrentIndex(i);
        setVisible((prev) => (prev.includes(i) ? prev : [...prev, i]));
      }, item.delay));
    });
    timers.push(setTimeout(() => finish(), STORY[STORY.length - 1].delay + 4000));
    return () => timers.forEach(clearTimeout);
  }, [finish]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSkip]);

  const stars = useMemo(
    () =>
      Array.from({ length: 50 }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        dur: 3 + Math.random() * 3,
        delay: Math.random() * 5,
      })),
    []
  );

  const lastFour = visible.slice(-4);

  return (
    <div
      className={`babel-intro${exiting ? ' babel-intro--exit' : ''}`}
      onClick={handleSkip}
    >
      <div className="babel-bg" aria-hidden="true">
        <div className="babel-bg__orb babel-bg__orb--primary" />
        <div className="babel-bg__orb babel-bg__orb--danger" />
        <div className="babel-bg__grid" />
        <div className="babel-bg__scanlines" />
        <div className="presentation__stars">
          {stars.map((s, i) => (
            <span
              key={i}
              className="presentation__star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                animationDuration: `${s.dur}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      <header className="babel-frame__header">
        <span>BABEL · LEXICON WAR</span>
        <span className="babel-frame__tag--accent">// PROLOGO</span>
      </header>

      <main className="babel-intro__main">
        <div className="presentation">
          <div className="babel-divider babel-divider--wide" />

          <div className="presentation__stage">
            {lastFour.map((idx) => {
              const item = STORY[idx];
              const isCurrent = idx === currentIndex;
              const cls = [
                'presentation__line',
                'presentation__line--visible',
                isCurrent ? 'presentation__line--current' : 'presentation__line--past',
                item.highlight ? 'presentation__line--highlight' : '',
              ].filter(Boolean).join(' ');
              return <p key={idx} className={cls}>{item.text}</p>;
            })}
          </div>

          <div className="babel-divider babel-divider--wide" />

          <div className="presentation__progress" aria-hidden="true">
            {STORY.map((_, i) => {
              const cls = [
                'presentation__dot',
                i < currentIndex ? 'presentation__dot--done' : '',
                i === currentIndex ? 'presentation__dot--current' : '',
              ].filter(Boolean).join(' ');
              return <span key={i} className={cls} />;
            })}
          </div>
        </div>
      </main>

      <footer className="babel-frame__footer">
        {skipEnabled ? '[ ENTER · ESPACIO · CLIC ] para omitir' : 'BABEL · LEXICON WAR'}
      </footer>
    </div>
  );
}
