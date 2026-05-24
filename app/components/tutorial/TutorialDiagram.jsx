// Dispatcher de diagramas de tutorial.
// Solo registry + render por `kind`. Diagramas viven en ./diagrams/.

import React from 'react';
import TypingDiagram from './TypingDiagram.jsx';

import { DiagBranch, DiagFlow, DiagCountdown } from './diagrams/shared.jsx';
import {
  DiagCombatIntro, DiagObjective, DiagStatBars, DiagLifeBar,
  DiagProximity, DiagWaves, DiagGrafemas,
} from './diagrams/combat.jsx';
import {
  DiagRacingType, DiagDistance, DiagTimer, DiagPhrase, DiagOpponent, DiagWpmAccuracy,
} from './diagrams/racing.jsx';
import {
  DiagHangarOverview, DiagHangarSlots, DiagHangarNav,
} from './diagrams/hangar.jsx';
import {
  DiagPosture, DiagNoLook, DiagAccuracy, DiagPractice,
} from './diagrams/typing.jsx';

const REGISTRY = {
  // shared
  keyboard:           (d) => <TypingDiagram highlight={d.highlight} />,
  'branch-typing':    DiagBranch,
  'flow-mode':        DiagFlow,
  countdown:          DiagCountdown,
  // combat
  'combat-intro':     DiagCombatIntro,
  'combat-objective': DiagObjective,
  'hp-bar':           DiagLifeBar,
  'hud-statbars':     DiagStatBars,
  proximity:          DiagProximity,
  waves:              DiagWaves,
  grafemas:           DiagGrafemas,
  // racing
  'racing-typing':    DiagRacingType,
  distance:           DiagDistance,
  timer:              DiagTimer,
  phrase:             DiagPhrase,
  opponent:           DiagOpponent,
  'wpm-acc':          DiagWpmAccuracy,
  // hangar
  'hangar-overview':  DiagHangarOverview,
  'hangar-slots':     DiagHangarSlots,
  'hangar-nav':       DiagHangarNav,
  // typing
  posture:            DiagPosture,
  'no-look':          DiagNoLook,
  accuracy:           DiagAccuracy,
  practice:           DiagPractice,
};

export default function TutorialDiagram({ diagram }) {
  if (!diagram || !diagram.kind) {
    return <div className="tut-illustration-placeholder" />;
  }
  const Cmp = REGISTRY[diagram.kind];
  if (!Cmp) return <div className="tut-illustration-placeholder" />;
  return (
    <div className="td-wrap">
      <Cmp {...diagram} />
    </div>
  );
}
