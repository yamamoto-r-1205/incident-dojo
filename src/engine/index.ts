/** Public surface of the pure game engine. */
export { BUILTINS, createInitialState, isBuiltin, run, step } from './engine.ts';
export { matchGlobalDanger, GLOBAL_DANGER_PENALTY } from './danger.ts';
export { normalizeInput } from './parser.ts';
export { buildTimeline, renderPostmortem, type TimelineEntry } from './postmortem.ts';
export { findRecoveryPath } from './reachability.ts';
export { computeScore, rankFor, SCORING, type Rank, type ScoreBreakdown } from './scoring.ts';
export { ID_PATTERN, scenarioSchema, type Locale, type LocalizedText, type Rule, type Scenario } from './schema.ts';
export type { GameState, HistoryEntry, OutputLine, Phase, StepResult } from './types.ts';
export { validateScenario, type ValidationIssue, type ValidationResult } from './validate.ts';
