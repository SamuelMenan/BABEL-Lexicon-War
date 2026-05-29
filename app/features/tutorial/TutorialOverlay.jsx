import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bridge } from '@shared/state/bridge.js';
import { KeybindService } from '@shared/services/keybindService.js';
import { getTutorial } from '@shared/data/tutorialContent.js';
import { EventBus } from '@shared/state/events.js';
import Icon from '@app/ui/Icon.jsx';
import { EventTypes } from '@shared/state/eventTypes.js';
import TutorialDiagram from './TutorialDiagram.jsx';
import KeyHint from '@app/ui/KeyHint.jsx';
import useTranslation from '@shared/i18n/useTranslation.js';
import { playBgm, getCurrentBgmKey } from '@shared/services/audioManager.js';
import '../../../styles/features/tutorial/tutorial.css';

export default function TutorialOverlay({ tutorialActive }) {
  const { t } = useTranslation();
  const { id, stepIndex } = tutorialActive || {};
  const tut = id ? getTutorial(id) : null;
  const step = tut?.steps?.[stepIndex] || null;
  const total = tut?.steps?.length || 0;
  const isLast = stepIndex >= total - 1;
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [practiceValue, setPracticeValue] = useState('');
  const [branchIdx, setBranchIdx] = useState(0); // 0 = typing, 1 = skip
  const rootRef = useRef(null);
  const branchSkipRef = useRef(null);
  const didFocusBranchRef = useRef(false);

  const practiceOk = step?.practice
    ? practiceValue.replace(/\s+/g, ' ').trim() === step.practice.replace(/\s+/g, ' ').trim()
    : true;

  useEffect(() => {
    setPracticeValue('');
    setConfirmSkip(false);
    setBranchIdx(0);
    didFocusBranchRef.current = false;
  }, [stepIndex, id]);

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
  // Registrar handlers en scope 'tutorial'.
  useEffect(() => {
    const guardCancel = (e) => {
      skip();
      return true;
    };
    const guardConfirm = (e) => {
      if (e?.target?.tagName === 'INPUT') {
        if (practiceOk) {
          advance();
          return true; // consumido
        }
        return false; // dejar pasar para escribir
      }
      if (step?.branch) {
        if (branchIdx === 0) handleBranch('typing');
        else handleBranch('skip');
        return true;
      }
      if (step?.practice && !practiceOk) {
        return true; // consumido para evitar avance indebido
      }
      advance();
      return true;
    };
    const guardNext = (e) => {
      if (e?.target?.tagName === 'INPUT') return false; // no consumir en input
      if (step?.branch || (step?.practice && !practiceOk)) {
        return true; // consumido para evitar avance indebido
      }
      advance();
      return true;
    };
    const guardPrev = (e) => {
      if (e?.target?.tagName === 'INPUT') return false; // no consumir en input
      if (step?.branch) {
        return true; // consumido para evitar retroceso indebido
      }
      if (stepIndex <= 0) {
        return true; // consumido para evitar propagacion al fondo
      }
      back();
      return true;
    };
    const guardUp = (e) => {
      if (step?.branch) {
        setBranchIdx(0);
      }
      return true;
    };
    const guardDown = (e) => {
      if (step?.branch) {
        setBranchIdx(1);
      }
      return true;
    };

    const offs = [
      KeybindService.register('tutorial', 'CONFIRM',  guardConfirm),
      KeybindService.register('tutorial', 'NAV_NEXT', guardNext),
      KeybindService.register('tutorial', 'NAV_PREV', guardPrev),
      KeybindService.register('tutorial', 'NAV_UP',   guardUp),
      KeybindService.register('tutorial', 'NAV_DOWN', guardDown),
      KeybindService.register('tutorial', 'CANCEL',   guardCancel),
    ];
    return () => offs.forEach(fn => fn());
  }, [advance, back, skip, practiceOk, step, stepIndex, branchIdx]);

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
                <button type="button"
                  className={`tut-btn tut-btn-primary ${branchIdx === 0 ? 'tut-btn--focused' : ''}`}
                  onClick={() => handleBranch('typing')}
                  style={branchIdx === 0 ? { outline: '2px solid var(--ship-hud, #00ffcc)', outlineOffset: '2px' } : {}}
                >
                  {step.branch.typing}
                </button>
                <button type="button"
                  ref={branchSkipRef}
                  className={`tut-btn ${branchIdx === 1 ? 'tut-btn--focused' : ''}`}
                  onClick={() => handleBranch('skip')}
                  style={branchIdx === 1 ? { outline: '2px solid var(--ship-hud, #00ffcc)', outlineOffset: '2px' } : {}}
                >
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
          <button type="button" className="tut-btn tut-btn-skip" onClick={skip}>
            {confirmSkip ? t('tutorial.skipConfirm') : t('tutorial.skip')}
          </button>

          <KeyHint
            className="tut-hint"
            items={[
              ...(step.branch
                ? [
                    { key: '↑/↓', label: t('keys.navigate') },
                    { key: '↵', label: t('common.confirm').toLowerCase() }
                  ]
                : [
                    ...(stepIndex > 0 ? [{ key: '←', label: t('common.back').toLowerCase() }] : []),
                    { key: '→ / ↵', label: step.practice ? t('keys.ready') : t('presentation.next') }
                  ]),
              { key: 'ESC', label: t('presentation.skip') }
            ]}
          />

          <div className="tut-nav">
            {stepIndex > 0 && (
              <button type="button" className="tut-btn" onClick={back}>{t('tutorial.back')}</button>
            )}
            {!step.branch && (
              <button type="button"
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
