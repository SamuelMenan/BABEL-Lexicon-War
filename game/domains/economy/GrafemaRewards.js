// Calculo de recompensas en Grafemas — combate y carrera.
// Funciones puras. No mutan estado. CombatSceneManager las llama y
// pasa el resultado a EconomySystem.award.

import {
  GRAFEMAS_PER_KILL, GRAFEMAS_PER_KILL_FALLBACK,
  GRAFEMAS_WORDLEN_REF, GRAFEMAS_WORDLEN_STEP,
  GRAFEMAS_WORDLEN_MULT_MIN, GRAFEMAS_WORDLEN_MULT_MAX,
  GRAFEMAS_PRECISION_MULT_CLEAN, GRAFEMAS_PRECISION_MULT_DIRTY,
  GRAFEMAS_STREAK_STEP, GRAFEMAS_STREAK_MAX_MULT,
  GRAFEMAS_RACE_BASE, GRAFEMAS_WPM_TIERS, GRAFEMAS_ACC_TIERS,
} from '@shared/config/constants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function wordLenMultiplier(len) {
  return clamp(
    1 + (len - GRAFEMAS_WORDLEN_REF) * GRAFEMAS_WORDLEN_STEP,
    GRAFEMAS_WORDLEN_MULT_MIN,
    GRAFEMAS_WORDLEN_MULT_MAX,
  );
}

function streakMultiplier(streakCount) {
  return clamp(1 + streakCount * GRAFEMAS_STREAK_STEP, 1, GRAFEMAS_STREAK_MAX_MULT);
}

// Devuelve { amount, breakdown } para un kill.
export function computeKillReward({ enemyType, wordLen = 4, hadError = false, streak = 0 }) {
  const base   = GRAFEMAS_PER_KILL[enemyType] ?? GRAFEMAS_PER_KILL_FALLBACK;
  const mLen   = wordLenMultiplier(wordLen);
  const mPrec  = hadError ? GRAFEMAS_PRECISION_MULT_DIRTY : GRAFEMAS_PRECISION_MULT_CLEAN;
  const mStrk  = streakMultiplier(streak);
  const amount = Math.round(base * mLen * mPrec * mStrk);
  return {
    amount,
    breakdown: { base, mLen, mPrec, mStrk, enemyType, wordLen, hadError, streak },
  };
}

// Recompensa carrera completada. Pasa { wpm, accuracy (0-1), position (1+, opcional) }.
export function computeRaceReward({ wpm = 0, accuracy = 0, position = null }) {
  const tiers = (val, table) => {
    for (const [threshold, reward] of table) if (val >= threshold) return reward;
    return 0;
  };
  const base    = GRAFEMAS_RACE_BASE;
  const bWpm    = tiers(wpm, GRAFEMAS_WPM_TIERS);
  const bAcc    = tiers(accuracy, GRAFEMAS_ACC_TIERS);
  const bPos    = position === 1 ? 300 : position === 2 ? 150 : position === 3 ? 75 : 0;
  const amount  = base + bWpm + bAcc + bPos;
  return {
    amount,
    breakdown: { base, bWpm, bAcc, bPos, wpm, accuracy, position },
  };
}
