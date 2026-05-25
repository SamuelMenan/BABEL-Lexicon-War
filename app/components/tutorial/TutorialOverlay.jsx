import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bridge } from '../../../shared/bridge.js';
import { KeybindService } from '../../../shared/keybindService.js';
import { getTutorial } from '../../../shared/tutorialContent.js';
import { EventBus } from '../../../shared/events.js';
import Icon from '../common/Icon.jsx';
import { EventTypes } from '../../../shared/eventTypes.js';
import TutorialDiagram from './TutorialDiagram.jsx';
import useTranslation from '../../../shared/i18n/useTranslation.js';
import { playBgm, getCurrentBgmKey } from '../../../shared/audioManager.js';
import '../../../styles/components/tutorial.css';

export default function TutorialOverlay({ tutorialActive }) {
  const { t } = useTranslation();
  const { id, stepIndex } = tutorialActive || {};
  const tut = id ? getTutorial(id) : null;
  const step = tut?.steps?.[stepIndex] || null;
  const total = tut?.steps?.length || 0;
  const isLast = stepIndex >= total - 1;
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [practiceValue, setPracticeValue] = useState('');
  const rootRef = useRef(null);
  const branchSkipRef = useRef(null);
  const didFocusBranchRef = useRef(false);

  useEffect(() => { setPracticeValue(''); setConfirmSkip(false); didFocusBranchRef.current = false; }, [stepIndex, id]);

  useEffect(() => {
    if (step?.branch && !didFocusBranchRef.current && branchSkipRef.current) {
      branchSkipRef.current.focus();
      didFocusBranchRef.current = true;
    }
  }, [step]);

  useEffect(() => {
    const prev = getCurrentBgmKey();
    playBgm('bgm.tutorial');
    return () => { if (prev) playBgm(prev); };
  }, []);

  const advance = useCallback(() => {
    if (isLast) Bridge.commands.completeTutorial();
    else Bridge.commands.advanceTutorial();
  }, [isLast]);

  const back = useCallback(() => { Bridge.commands.backTutorial(); }, []);

  const skip = useCallback(() => {
    if (!confirmSkip) { setConfirmSkip(true); return; }
    Bridge.commands.skipTutorial();
  }, [confirmSkip]);

  // Tutorial scope ya pusheado por App.jsx cuando tutorialActive cambia.
  // Registrar handlers en scope 'tutorial'. Si el foco esta en <input> (practica),
  // dejamos pasar para no romper typing local — el handler check e.target.
  useEffect(() => {
    const guard = (fn) => (e) => {
      if (e?.target?.tagName === 'INPUT') return false; // no consumir
      fn();
      return true;
    };
    const offs = [
      KeybindService.register('tutorial', 'CONFIRM',  guard(advance)),
      KeybindService.register('tutorial', 'NAV_NEXT', guard(advance)),
      KeybindService.register('tutorial', 'NAV_PREV', guard(back)),
      KeybindService.register('tutorial', 'CANCEL',   guard(skip)),
    ];
    return () => offs.forEach(fn => fn());
  }, [advance, back, skip]);

  if (!tut || !step) return null;

  const handleBranch = (target) => {
    if (target === 'typing') {
      // Inserta typing antes de continuar el tutorial actual. Guardamos
      // contexto: tutorial padre + step donde continuar. Al terminar typing
      // (completar o skip), restauramos padre en el step siguiente al branch.
      const parentId = id;
      const resumeStep = stepIndex + 1;
      const cleanup = () => { offDone(); offSkip(); };
      const resume = () => {
        Bridge.commands.startTutorial(parentId);
        // Avanzar hasta resumeStep secuencialmente (startTutorial deja en 0).
        for (let i = 0; i < resumeStep; i++) {
          setTimeout(() => Bridge.commands.advanceTutorial(), 20 + i * 10);
        }
      };
      const offDone = EventBus.on(EventTypes.TUTORIAL_COMPLETED, (p) => {
        if (p?.id !== 'typing') return;
        cleanup();
        resume();
      });
      const offSkip = EventBus.on(EventTypes.TUTORIAL_SKIPPED, (p) => {
        if (p?.id !== 'typing') return;
        cleanup();
        resume();
      });
      Bridge.commands.startTutorial('typing');
    } else {
      // skip branch = continuar tutorial actual
      Bridge.commands.advanceTutorial();
    }
  };

  const practiceOk = step.practice
    ? practiceValue.replace(/\s+/g, ' ').trim() === step.practice.replace(/\s+/g, ' ').trim()
    : true;

  return (
    <div className="tut-backdrop" role="dialog" aria-modal="true" ref={rootRef}>
      <div className="tut-frame">
        <div className="tut-header">
          <span className="tut-chip">{tut.titleChip}</span>
          <span className="tut-progress">{stepIndex + 1} / {total}</span>
        </div>

        <div className="tut-body">
          <div className="tut-text">
            <h2 className="tut-title">{step.title}</h2>
            <p className="tut-paragraph">{step.body}</p>

            {step.practice && (
              <div className="tut-practice">
                <input
                  type="text"
                  className="tut-practice-input"
                  value={practiceValue}
                  onChange={(e) => setPracticeValue(e.target.value)}
                  placeholder={step.practice}
                  autoFocus
                  spellCheck={false}
                />
                <div className={`tut-practice-status ${practiceOk ? 'ok' : ''}`}>
                  {practiceOk ? (<><Icon name="check" size={14} /> {t('tutorial.ready')}</>) : t('tutorial.typeExactLine')}
                </div>
              </div>
            )}

            {step.branch && (
              <div className="tut-branch">
                <button className="tut-btn tut-btn-primary" onClick={() => handleBranch('typing')}>
                  {step.branch.typing}
                </button>
                <button ref={branchSkipRef} className="tut-btn" onClick={() => handleBranch('skip')}>
                  {step.branch.skip}
                </button>
              </div>
            )}
          </div>

          <div className="tut-illustration">
            <TutorialDiagram diagram={step.diagram} />
          </div>
        </div>

        <div className="tut-footer">
          <button className="tut-btn tut-btn-skip" onClick={skip}>
            {confirmSkip ? t('tutorial.skipConfirm') : t('tutorial.skip')}
          </button>
          <div className="tut-nav">
            {stepIndex > 0 && (
              <button className="tut-btn" onClick={back}>{t('tutorial.back')}</button>
            )}
            {!step.branch && (
              <button
                className="tut-btn tut-btn-primary"
                onClick={advance}
                disabled={step.practice && !practiceOk}
              >
                {step.ctaContinue || (isLast ? t('tutorial.finish') : t('tutorial.next'))}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
