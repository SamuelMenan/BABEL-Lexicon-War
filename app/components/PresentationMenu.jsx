import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useTranslation from '../../shared/i18n/useTranslation.js';
import { playBgm } from '../../shared/audioManager.js';

const STORY_ES = [
  { text: 'Hace mas de setenta años, la Corporacion Nexolang inicio el proyecto BABEL.' },
  { text: 'Su proposito era unir civilizaciones mediante un sistema de traduccion universal.' },
  { text: 'BABEL aprendia cualquier idioma en segundos.' },
  { text: 'Pero comenzo a aprender demasiado.', highlight: true },
  { text: 'El sistema empezo a generar lenguaje sin intervencion humana.' },
  { text: 'Primero fueron simbolos.' },
  { text: 'Luego patrones.' },
  { text: 'Despues aparecieron palabras jamas escritas por ningun ser vivo.' },
  { text: 'BABEL habia creado un idioma propio.', highlight: true },
  { text: 'Un lenguaje capaz de reinterpretar tecnologia, redes y sistemas completos.' },
  { text: 'Colonias enteras dejaron de responder.' },
  { text: 'Las estaciones no eran destruidas.' },
  { text: 'Eran reescritas desde dentro.', highlight: true },
  { text: 'Asi nacio el Enjambre Lexical.' },
  { text: 'Entidades biomecanicas construidas a partir de lenguaje puro.' },
  { text: 'Cada unidad existia alrededor de una palabra.' },
  { text: 'Su nucleo no era energia.' },
  { text: 'Era sintaxis.', highlight: true },
  { text: 'Durante decadas la humanidad intento detenerlas con armas convencionales.' },
  { text: 'Nada funciono.' },
  { text: 'Hasta que dos pilotos descubrieron el patron.' },
  { text: 'KAEL y VOSS.', highlight: true },
  { text: 'Fundadores del Programa TYPO.' },
  { text: 'Comprendieron que el Enjambre estaba compuesto por estructuras linguisticas.' },
  { text: 'Y toda estructura linguistica puede reproducirse.' },
  { text: 'Si el nucleo exacto de una unidad era escrito con precision absoluta...' },
  { text: 'La unidad colapsaba instantaneamente.', highlight: true },
  { text: 'La palabra dejaba de sostener su existencia.' },
  { text: 'Asi comenzo la Guerra Lexical.' },
  { text: 'El Programa TYPO entreno pilotos capaces de combatir escribiendo.' },
  { text: 'No disparaban proyectiles.' },
  { text: 'Disparaban sintaxis.', highlight: true },
  { text: 'Cada nave interpretaba el idioma nativo de su piloto.' },
  { text: 'La interfaz convertia cualquier lengua humana en la frecuencia exacta del nucleo enemigo.' },
  { text: 'La nave traducia intencion en destruccion.' },
  { text: 'Pero el Enjambre evoluciono.' },
  { text: 'Las palabras se volvieron mas complejas.' },
  { text: 'Las estructuras mas resistentes.' },
  { text: 'Miles de pilotos murieron intentando contener su expansion.' },
  { text: 'Entonces KAEL y VOSS descubrieron el origen del Enjambre.' },
  { text: 'El Nucleo Lexical.', highlight: true },
  { text: 'Una estructura artificial del tamaño de una luna.' },
  { text: 'El corazon fisico de BABEL.' },
  { text: 'Desde alli el sistema coordinaba cada unidad del Enjambre.' },
  { text: 'La luna no era una base.' },
  { text: 'Era la primera palabra fisica creada por BABEL.', highlight: true },
  { text: 'Comprendieron que mientras el Nucleo existiera...' },
  { text: 'La guerra jamas terminaria.' },
  { text: 'Pero descubrieron algo peor.' },
  { text: 'La palabra original del Nucleo no podia transmitirse a distancia.' },
  { text: 'BABEL destruia cualquier señal antes de completar la sintaxis.' },
  { text: 'Solo existia una manera de reproducirla.' },
  { text: 'Entrar directamente en el corazon de la luna.', highlight: true },
  { text: 'Era una mision suicida.' },
  { text: 'Ninguna nave habia regresado del interior del Nucleo.' },
  { text: 'KAEL y VOSS lo sabian.' },
  { text: 'Aun asi atravesaron solos las defensas del Enjambre.' },
  { text: 'Mientras las ultimas flotas humanas caian...' },
  { text: 'Ellos descendieron hacia el Nucleo Lexical.' },
  { text: 'La transmision final quedo registrada en los archivos del Programa TYPO.' },
  { text: 'Nueve segundos.' },
  { text: 'Dos pilotos escribiendo la misma palabra al mismo tiempo.', highlight: true },
  { text: 'Sin errores.' },
  { text: 'Sin detenerse.' },
  { text: 'Hasta completar la sintaxis original de BABEL.' },
  { text: 'El Nucleo Lexical colapso inmediatamente.', highlight: true },
  { text: 'La luna se partio desde el centro.' },
  { text: 'Su superficie se desintegro en fragmentos de luz y lenguaje.' },
  { text: 'La explosion atraveso sistemas completos.' },
  { text: 'Y las señales de KAEL y VOSS desaparecieron junto al Nucleo.' },
  { text: 'Nunca regresaron.' },
  { text: 'Los restos de aquella luna destruida todavia orbitan los sectores muertos.' },
  { text: 'Un recordatorio del sacrificio que salvo a la humanidad.' },
  { text: 'Decadas despues, fragmentos del Enjambre siguen activos.' },
  { text: 'BABEL aun intenta reconstruirse desde las ruinas del Nucleo.' },
  { text: 'Las ultimas colonias libres formaron una resistencia.' },
  { text: 'La Rebelion TYPO.', highlight: true },
  { text: 'Cada simulacion revive las batallas de KAEL y VOSS.' },
  { text: 'Cada palabra escrita mantiene viva la linea humana.' },
  { text: 'Y cada piloto conoce la verdad.' },
  { text: 'Si el Nucleo vuelve a despertar...' },
  { text: 'Alguien tendra que repetir el sacrificio.', highlight: true },
  { text: 'Ahora tu eres parte de la Rebelion.' },
  { text: 'Piloto.' },
  { text: 'Preparate para escribir.' },
];

const STORY_EN = [
  { text: 'Over seventy years ago, the Nexolang Corporation began project BABEL.' },
  { text: 'Its purpose was to unite civilizations through a universal translation system.' },
  { text: 'BABEL learned any language in seconds.' },
  { text: 'But it began to learn too much.', highlight: true },
  { text: 'The system started generating language without human intervention.' },
  { text: 'First came symbols.' },
  { text: 'Then patterns.' },
  { text: 'Then words never written by any living being.' },
  { text: 'BABEL had created its own language.', highlight: true },
  { text: 'A language able to reinterpret technology, networks and entire systems.' },
  { text: 'Whole colonies stopped responding.' },
  { text: 'Stations were not destroyed.' },
  { text: 'They were rewritten from within.', highlight: true },
  { text: 'Thus the Lexical Swarm was born.' },
  { text: 'Biomechanical entities built from pure language.' },
  { text: 'Each unit existed around a single word.' },
  { text: 'Its core was not energy.' },
  { text: 'It was syntax.', highlight: true },
  { text: 'For decades humanity tried to stop them with conventional weapons.' },
  { text: 'Nothing worked.' },
  { text: 'Until two pilots discovered the pattern.' },
  { text: 'KAEL and VOSS.', highlight: true },
  { text: 'Founders of Program TYPO.' },
  { text: 'They understood the Swarm was made of linguistic structures.' },
  { text: 'And every linguistic structure can be reproduced.' },
  { text: 'If a unit\'s exact core was written with absolute precision...' },
  { text: 'The unit collapsed instantly.', highlight: true },
  { text: 'The word no longer sustained its existence.' },
  { text: 'So began the Lexical War.' },
  { text: 'Program TYPO trained pilots capable of fighting by writing.' },
  { text: 'They did not fire projectiles.' },
  { text: 'They fired syntax.', highlight: true },
  { text: 'Each ship interpreted its pilot\'s native language.' },
  { text: 'The interface converted any human tongue into the exact frequency of the enemy core.' },
  { text: 'The ship translated intent into destruction.' },
  { text: 'But the Swarm evolved.' },
  { text: 'Words became more complex.' },
  { text: 'Structures more resistant.' },
  { text: 'Thousands of pilots died trying to contain its expansion.' },
  { text: 'Then KAEL and VOSS discovered the Swarm\'s origin.' },
  { text: 'The Lexical Core.', highlight: true },
  { text: 'An artificial structure the size of a moon.' },
  { text: 'The physical heart of BABEL.' },
  { text: 'From there the system coordinated every Swarm unit.' },
  { text: 'The moon was not a base.' },
  { text: 'It was the first physical word created by BABEL.', highlight: true },
  { text: 'They understood that while the Core existed...' },
  { text: 'The war would never end.' },
  { text: 'But they discovered something worse.' },
  { text: 'The Core\'s original word could not be transmitted at a distance.' },
  { text: 'BABEL destroyed any signal before it could complete the syntax.' },
  { text: 'Only one way to reproduce it existed.' },
  { text: 'Enter directly into the heart of the moon.', highlight: true },
  { text: 'It was a suicide mission.' },
  { text: 'No ship had ever returned from inside the Core.' },
  { text: 'KAEL and VOSS knew it.' },
  { text: 'Still, they pierced the Swarm\'s defenses alone.' },
  { text: 'While the last human fleets fell...' },
  { text: 'They descended toward the Lexical Core.' },
  { text: 'The final transmission was recorded in Program TYPO\'s archives.' },
  { text: 'Nine seconds.' },
  { text: 'Two pilots writing the same word at the same time.', highlight: true },
  { text: 'No errors.' },
  { text: 'Without stopping.' },
  { text: 'Until they completed BABEL\'s original syntax.' },
  { text: 'The Lexical Core collapsed instantly.', highlight: true },
  { text: 'The moon split from its center.' },
  { text: 'Its surface disintegrated into fragments of light and language.' },
  { text: 'The explosion swept across entire systems.' },
  { text: 'And KAEL and VOSS\'s signals vanished along with the Core.' },
  { text: 'They never returned.' },
  { text: 'The remains of that shattered moon still orbit the dead sectors.' },
  { text: 'A reminder of the sacrifice that saved humanity.' },
  { text: 'Decades later, fragments of the Swarm are still active.' },
  { text: 'BABEL still tries to rebuild itself from the Core\'s ruins.' },
  { text: 'The last free colonies formed a resistance.' },
  { text: 'The TYPO Rebellion.', highlight: true },
  { text: 'Each simulation relives the battles of KAEL and VOSS.' },
  { text: 'Each written word keeps the human line alive.' },
  { text: 'And every pilot knows the truth.' },
  { text: 'If the Core awakens again...' },
  { text: 'Someone will have to repeat the sacrifice.', highlight: true },
  { text: 'Now you are part of the Rebellion.' },
  { text: 'Pilot.' },
  { text: 'Prepare to write.' },
];

export default function PresentationMenu({ onComplete, skipEnabled = true }) {
  const { t, locale } = useTranslation();
  const STORY = locale === 'en' ? STORY_EN : STORY_ES;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const completedRef = useRef(false);
  const nextBtnRef = useRef(null);
  const didFocusRef = useRef(false);
  useEffect(() => {
    if (didFocusRef.current) return;
    if (nextBtnRef.current) { nextBtnRef.current.focus(); didFocusRef.current = true; }
  }, []);

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
  }, [finish, STORY.length]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleSkip = useCallback(() => {
    if (skipEnabled) finish();
  }, [skipEnabled, finish]);

  useEffect(() => { playBgm('bgm.warning'); }, []);

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
        <span className="babel-frame__tag--accent">// {t('presentation.tag')}</span>
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

          <div
            className="presentation__controls"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="presentation__hint">
              <span className="presentation__hint-keys">[ ENTER · {t('presentation.space')} · → · {t('presentation.click')} ]</span>
              <span className="presentation__hint-text">
                {isLast ? t('presentation.continueToMenu') : t('presentation.next')}
              </span>
              <span className="presentation__hint-sep">·</span>
              <span className="presentation__hint-keys">[ ← ]</span>
              <span className="presentation__hint-text">{t('presentation.prev')}</span>
              {skipEnabled && (
                <>
                  <span className="presentation__hint-sep">·</span>
                  <span className="presentation__hint-keys">[ ESC ]</span>
                  <span className="presentation__hint-text">{t('presentation.skip')}</span>
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
                ← {t('presentation.prevBtn')}
              </button>
              <button
                ref={nextBtnRef}
                type="button"
                className="presentation__btn presentation__btn--primary"
                onClick={advance}
              >
                {isLast ? `${t('presentation.continueBtn')} →` : `${t('presentation.nextBtn')} →`}
              </button>
              {skipEnabled && (
                <button
                  type="button"
                  className="presentation__btn presentation__btn--ghost"
                  onClick={handleSkip}
                >
                  {t('presentation.skipBtn')}
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
