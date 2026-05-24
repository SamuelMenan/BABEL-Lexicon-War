import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORY = [
  {
    text: 'Hace mas de setenta años, la Corporacion Nexolang inicio el proyecto BABEL.',
  },
  {
    text: 'Su proposito era unir civilizaciones mediante un sistema de traduccion universal.',
  },
  {
    text: 'BABEL aprendia cualquier idioma en segundos.',
  },
  {
    text: 'Pero comenzo a aprender demasiado.',
    highlight: true,
  },
  {
    text: 'El sistema empezo a generar lenguaje sin intervencion humana.',
  },
  {
    text: 'Primero fueron simbolos.',
  },
  {
    text: 'Luego patrones.',
  },
  {
    text: 'Despues aparecieron palabras jamas escritas por ningun ser vivo.',
  },
  {
    text: 'BABEL habia creado un idioma propio.',
    highlight: true,
  },
  {
    text: 'Un lenguaje capaz de reinterpretar tecnologia, redes y sistemas completos.',
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
    text: 'Asi nacio el Enjambre Lexical.',
  },
  {
    text: 'Entidades biomecanicas construidas a partir de lenguaje puro.',
  },
  {
    text: 'Cada unidad existia alrededor de una palabra.',
  },
  {
    text: 'Su nucleo no era energia.',
  },
  {
    text: 'Era sintaxis.',
    highlight: true,
  },
  {
    text: 'Durante decadas la humanidad intento detenerlas con armas convencionales.',
  },
  {
    text: 'Nada funciono.',
  },
  {
    text: 'Hasta que dos pilotos descubrieron el patron.',
  },
  {
    text: 'KAEL y VOSS.',
    highlight: true,
  },
  {
    text: 'Fundadores del Programa TYPO.',
  },
  {
    text: 'Comprendieron que el Enjambre estaba compuesto por estructuras linguisticas.',
  },
  {
    text: 'Y toda estructura linguistica puede reproducirse.',
  },
  {
    text: 'Si el nucleo exacto de una unidad era escrito con precision absoluta...',
  },
  {
    text: 'La unidad colapsaba instantaneamente.',
    highlight: true,
  },
  {
    text: 'La palabra dejaba de sostener su existencia.',
  },
  {
    text: 'Asi comenzo la Guerra Lexical.',
  },
  {
    text: 'El Programa TYPO entreno pilotos capaces de combatir escribiendo.',
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
    text: 'La interfaz convertia cualquier lengua humana en la frecuencia exacta del nucleo enemigo.',
  },
  {
    text: 'La nave traducia intencion en destruccion.',
  },
  {
    text: 'Pero el Enjambre evoluciono.',
  },
  {
    text: 'Las palabras se volvieron mas complejas.',
  },
  {
    text: 'Las estructuras mas resistentes.',
  },
  {
    text: 'Miles de pilotos murieron intentando contener su expansion.',
  },
  {
    text: 'Entonces KAEL y VOSS descubrieron el origen del Enjambre.',
  },
  {
    text: 'El Nucleo Lexical.',
    highlight: true,
  },
  {
    text: 'Una estructura artificial del tamaño de una luna.',
  },
  {
    text: 'El corazon fisico de BABEL.',
  },
  {
    text: 'Desde alli el sistema coordinaba cada unidad del Enjambre.',
  },
  {
    text: 'La luna no era una base.',
  },
  {
    text: 'Era la primera palabra fisica creada por BABEL.',
    highlight: true,
  },
  {
    text: 'Comprendieron que mientras el Nucleo existiera...',
  },
  {
    text: 'La guerra jamas terminaria.',
  },
  {
    text: 'Pero descubrieron algo peor.',
  },
  {
    text: 'La palabra original del Nucleo no podia transmitirse a distancia.',
  },
  {
    text: 'BABEL destruia cualquier señal antes de completar la sintaxis.',
  },
  {
    text: 'Solo existia una manera de reproducirla.',
  },
  {
    text: 'Entrar directamente en el corazon de la luna.',
    highlight: true,
  },
  {
    text: 'Era una mision suicida.',
  },
  {
    text: 'Ninguna nave habia regresado del interior del Nucleo.',
  },
  {
    text: 'KAEL y VOSS lo sabian.',
  },
  {
    text: 'Aun asi atravesaron solos las defensas del Enjambre.',
  },
  {
    text: 'Mientras las ultimas flotas humanas caian...',
  },
  {
    text: 'Ellos descendieron hacia el Nucleo Lexical.',
  },
  {
    text: 'La transmision final quedo registrada en los archivos del Programa TYPO.',
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
    text: 'El Nucleo Lexical colapso inmediatamente.',
    highlight: true,
  },
  {
    text: 'La luna se partio desde el centro.',
  },
  {
    text: 'Su superficie se desintegro en fragmentos de luz y lenguaje.',
  },
  {
    text: 'La explosion atraveso sistemas completos.',
  },
  {
    text: 'Y las señales de KAEL y VOSS desaparecieron junto al Nucleo.',
  },
  {
    text: 'Nunca regresaron.',
  },
  {
    text: 'Los restos de aquella luna destruida todavia orbitan los sectores muertos.',
  },
  {
    text: 'Un recordatorio del sacrificio que salvo a la humanidad.',
  },
  {
    text: 'Decadas despues, fragmentos del Enjambre siguen activos.',
  },
  {
    text: 'BABEL aun intenta reconstruirse desde las ruinas del Nucleo.',
  },
  {
    text: 'Las ultimas colonias libres formaron una resistencia.',
  },
  {
    text: 'La Rebelion TYPO.',
    highlight: true,
  },
  {
    text: 'Cada simulacion revive las batallas de KAEL y VOSS.',
  },
  {
    text: 'Cada palabra escrita mantiene viva la linea humana.',
  },
  {
    text: 'Y cada piloto conoce la verdad.',
  },
  {
    text: 'Si el Nucleo vuelve a despertar...',
  },
  {
    text: 'Alguien tendra que repetir el sacrificio.',
    highlight: true,
  },
  {
    text: 'Ahora tu eres parte de la Rebelion.',
  },
  {
    text: 'Piloto.',
  },
  {
    text: 'Preparate para escribir.',
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
                {isLast ? 'continuar al menu' : 'siguiente'}
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
