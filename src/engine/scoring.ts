import type { Scenario } from './schema.ts';
import type { GameState } from './types.ts';

// ---- Scoring rules (Requirement 5) ----

export const SCORING = {
  base: 100,
  perCommandOverPar: 2,
  wrongOrMissingCause: 30,
  perHint: 5,
  notRecovered: 40,
} as const;

/** Rank thresholds, highest first. */
const RANKS = [
  { rank: 'S', min: 90 },
  { rank: 'A', min: 75 },
  { rank: 'B', min: 50 },
  { rank: 'C', min: 0 },
] as const;

/** Letter rank. */
export type Rank = (typeof RANKS)[number]['rank'];

/** Score with the individual penalties, for display and postmortems. */
export interface ScoreBreakdown {
  readonly score: number;
  readonly rank: Rank;
  readonly overPar: number;
  readonly penalties: {
    readonly overPar: number;
    readonly danger: number;
    readonly rootCause: number;
    readonly hints: number;
    readonly notRecovered: number;
  };
  readonly rootCauseCorrect: boolean;
}

/**
 * Compute the score for a (finished or unfinished) session.
 * @param scenario - scenario played
 * @param state - game state
 * @returns clamped score (0..100), rank and penalty breakdown
 */
export function computeScore(scenario: Scenario, state: GameState): ScoreBreakdown {
  const overPar = Math.max(0, state.commandCount - scenario.par);
  const rootCauseCorrect = state.reportedCause === scenario.correctRootCause;
  const penalties = {
    overPar: overPar * SCORING.perCommandOverPar,
    danger: state.dangerPenalty,
    rootCause: rootCauseCorrect ? 0 : SCORING.wrongOrMissingCause,
    hints: state.hintsUsed * SCORING.perHint,
    notRecovered: state.phase === 'investigating' ? SCORING.notRecovered : 0,
  };
  const total = Object.values(penalties).reduce((sum, p) => sum + p, 0);
  const score = clamp(SCORING.base - total, 0, 100);
  return { score, rank: rankFor(score), overPar, penalties, rootCauseCorrect };
}

/**
 * Map a score to a letter rank.
 * @param score - score in 0..100
 * @returns S, A, B or C
 */
export function rankFor(score: number): Rank {
  const hit = RANKS.find((r) => score >= r.min);
  return hit ? hit.rank : 'C';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
