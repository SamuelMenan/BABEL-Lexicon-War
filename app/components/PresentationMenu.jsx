import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORY = [
  {
    text: 'Hace más de setenta años, la Corporación Nexolang inició el proyecto BABEL.',
  },
  {
    text: 'Su propósito era unir civilizaciones mediante un sistema de traducción universal.',
  },
  {
    text: 'BABEL aprendía cualquier idioma en segundos.',
  },
  {
    text: 'Pero comenzó a aprender demasiado.',
    highlight: true,
  },
  {
    text: 'El sistema empezó a generar lenguaje sin intervención humana.',
  },
  {
    text: 'Primero fueron símbolos.',
  },
  {
    text: 'Luego patrones.',
  },
  {
    text: 'Después aparecieron palabras jamás escritas por ningún ser vivo.',
  },
  {
    text: 'BABEL había creado un idioma propio.',
    highlight: true,
  },
  {
    text: 'Un lenguaje capaz de reinterpretar tecnología, redes y sistemas completos.',
  },
  {
    text: 'Colonias enteras dejaron de responder.',
  },
  {
    text: 'Las estaciones no eran destruidas.',
  },
  {
    text: 'Eran reescritas desde dentro.',
    highlight: true,
  },
  {
    text: 'Así nació el Enjambre Lexical.',
  },
  {
    text: 'Entidades biomecánicas construidas a partir de lenguaje puro.',
  },
  {
    text: 'Cada unidad existía alrededor de una palabra.',
  },
  {
    text: 'Su núcleo no era energía.',
  },
  {
    text: 'Era sintaxis.',
    highlight: true,
  },
  {
    text: 'Durante décadas la humanidad intentó detenerlas con armas convencionales.',
  },
  {
    text: 'Nada funcionó.',
  },
  {
    text: 'Hasta que dos pilotos descubrieron el patrón.',
  },
  {
    text: 'KAEL y VOSS.',
    highlight: true,
  },
  {
    text: 'Fundadores del Programa TYPO.',
  },
  {
    text: 'Comprendieron que el Enjambre estaba compuesto por estructuras lingüísticas.',
  },
  {
    text: 'Y toda estructura lingüística puede reproducirse.',
  },
  {
    text: 'Si el núcleo exacto de una unidad era escrito con precisión absoluta...',
  },
  {
    text: 'La unidad colapsaba instantáneamente.',
    highlight: true,
  },
  {
    text: 'La palabra dejaba de sostener su existencia.',
  },
  {
    text: 'Así comenzó la Guerra Lexical.',
  },
  {
    text: 'El Programa TYPO entrenó pilotos capaces de combatir escribiendo.',
  },
  {
    text: 'No disparaban proyectiles.',
  },
  {
    text: 'Disparaban sintaxis.',
    highlight: true,
  },
  {
    text: 'Cada nave interpretaba el idioma nativo de su piloto.',
  },
  {
    text: 'La interfaz convertía cualquier lengua humana en la frecuencia exacta del núcleo enemigo.',
  },
  {
    text: 'La nave traducía intención en destrucción.',
  },
  {
    text: 'Pero el Enjambre evolucionó.',
  },
  {
    text: 'Las palabras se volvieron más complejas.',
  },
  {
    text: 'Las estructuras más resistentes.',
  },
  {
    text: 'Miles de pilotos murieron intentando contener su expansión.',
  },
  {
    text: 'Entonces KAEL y VOSS descubrieron el origen del Enjambre.',
  },
  {
    text: 'El Núcleo Lexical.',
    highlight: true,
  },
  {
    text: 'Una estructura artificial del tamaño de una luna.',
  },
  {
    text: 'El corazón físico de BABEL.',
  },
  {
    text: 'Desde allí el sistema coordinaba cada unidad del Enjambre.',
  },
  {
    text: 'La luna no era una base.',
  },
  {
    text: 'Era la primera palabra física creada por BABEL.',
    highlight: true,
  },
  {
    text: 'Comprendieron que mientras el Núcleo existiera...',
  },
  {
    text: 'La guerra jamás terminaría.',
  },
  {
    text: 'Pero descubrieron algo peor.',
  },
  {
    text: 'La palabra original del Núcleo no podía transmitirse a distancia.',
  },
  {
    text: 'BABEL destruía cualquier señal antes de completar la sintaxis.',
  },
  {
    text: 'Solo existía una manera de reproducirla.',
  },
  {
    text: 'Entrar directamente en el corazón de la luna.',
    highlight: true,
  },
  {
    text: 'Era una misión suicida.',
  },
  {
    text: 'Ninguna nave había regresado del interior del Núcleo.',
  },
  {
    text: 'KAEL y VOSS lo sabían.',
  },
  {
    text: 'Aun así atravesaron solos las defensas del Enjambre.',
  },
  {
    text: 'Mientras las últimas flotas humanas caían...',
  },
  {
    text: 'Ellos descendieron hacia el Núcleo Lexical.',
  },
  {
    text: 'La transmisión final quedó registrada en los archivos del Programa TYPO.',
  },
  {
    text: 'Nueve segundos.',
  },
  {
    text: 'Dos pilotos escribiendo la misma palabra al mismo tiempo.',
    highlight: true,
  },
  {
    text: 'Sin errores.',
  },
  {
    text: 'Sin detenerse.',
  },
  {
    text: 'Hasta completar la sintaxis original de BABEL.',
  },
  {
    text: 'El Núcleo Lexical colapsó inmediatamente.',
    highlight: true,
  },
  {
    text: 'La luna se partió desde el centro.',
  },
  {
    text: 'Su superficie se desintegró en fragmentos de luz y lenguaje.',
  },
  {
    text: 'La explosión atravesó sistemas completos.',
  },
  {
    text: 'Y las señales de KAEL y VOSS desaparecieron junto al Núcleo.',
  },
  {
    text: 'Nunca regresaron.',
  },
  {
    text: 'Los restos de aquella luna destruida todavía orbitan los sectores muertos.',
  },
  {
    text: 'Un recordatorio del sacrificio que salvó a la humanidad.',
  },
  {
    text: 'Décadas después, fragmentos del Enjambre siguen activos.',
  },
  {
    text: 'BABEL aún intenta reconstruirse desde las ruinas del Núcleo.',
  },
  {
    text: 'Las últimas colonias libres formaron una resistencia.',
  },
  {
    text: 'La Rebelión TYPO.',
    highlight: true,
  },
  {
    text: 'Cada simulación revive las batallas de KAEL y VOSS.',
  },
  {
    text: 'Cada palabra escrita mantiene viva la línea humana.',
  },
  {
    text: 'Y cada piloto conoce la verdad.',
  },
  {
    text: 'Si el Núcleo vuelve a despertar...',
  },
  {
    text: 'Alguien tendrá que repetir el sacrificio.',
    highlight: true,
  },
  {
    text: 'Ahora tú eres parte de la Rebelión.',
  },
  {
    text: 'Piloto.',
  },
  {
    text: 'Prepárate para escribir.',
  },
];

export default function PresentationMenu({ onComplete, skipEnabled = true }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setExiting(true);
    setTimeout(() => onComplete?.(), 500);
  }, [onComplete]);

  const advance = useCallback(() => {
    setCurrentIndex((i) => {
      if (i >= STORY.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [finish]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleSkip = useCallback(() => {
    if (skipEnabled) finish();
  }, [skipEnabled, finish]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        advance();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, goBack, handleSkip]);

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

  const start = Math.max(0, currentIndex - 3);
  const visibleRange = STORY.slice(start, currentIndex + 1);
  const isLast = currentIndex >= STORY.length - 1;

  return (
    <div
      className={`babel-intro${exiting ? ' babel-intro--exit' : ''}`}
      onClick={advance}
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
            {visibleRange.map((item, offset) => {
              const idx = start + offset;
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

          {/* Controles visibles en pantalla */}
          <div
            className="presentation__controls"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="presentation__hint">
              <span className="presentation__hint-keys">[ ENTER · ESPACIO · → · CLIC ]</span>
              <span className="presentation__hint-text">
                {isLast ? 'continuar al menú' : 'siguiente'}
              </span>
              <span className="presentation__hint-sep">·</span>
              <span className="presentation__hint-keys">[ ← ]</span>
              <span className="presentation__hint-text">anterior</span>
              {skipEnabled && (
                <>
                  <span className="presentation__hint-sep">·</span>
                  <span className="presentation__hint-keys">[ ESC ]</span>
                  <span className="presentation__hint-text">omitir</span>
                </>
              )}
            </div>
            <div className="presentation__btn-row">
              <button
                type="button"
                className="presentation__btn presentation__btn--ghost"
                onClick={goBack}
                disabled={currentIndex === 0}
              >
                ← Anterior
              </button>
              <button
                type="button"
                className="presentation__btn presentation__btn--primary"
                onClick={advance}
              >
                {isLast ? 'Continuar →' : 'Siguiente →'}
              </button>
              {skipEnabled && (
                <button
                  type="button"
                  className="presentation__btn presentation__btn--ghost"
                  onClick={handleSkip}
                >
                  Omitir
                </button>
              )}
            </div>
          </div>

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
        BABEL · LEXICON WAR · {currentIndex + 1} / {STORY.length}
      </footer>
    </div>
  );
}
