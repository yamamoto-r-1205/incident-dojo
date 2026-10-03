import { GLOBAL_DANGER_PENALTY, matchGlobalDanger } from './danger.ts';
import { MESSAGES, t } from './messages.ts';
import { applyEffects, conditionHolds, normalizeInput, selectRule } from './parser.ts';
import type { Locale, Rule, Scenario } from './schema.ts';
import type { GameState, HistoryEntry, OutputLine, StepResult } from './types.ts';

// ---- Constants ----

/** Builtin command names. Scenario rules must not shadow them (checked by the validator). */
export const BUILTINS = ['help', 'hint', 'causes', 'report', 'clear'] as const;

// Long pastes are cut so pattern matching stays cheap.
const MAX_INPUT_LENGTH = 500;

// ---- Public API ----

/**
 * Create the starting state for a scenario.
 * @param scenario - parsed scenario
 * @returns initial game state
 */
export function createInitialState(scenario: Scenario): GameState {
  return {
    scenarioId: scenario.id,
    phase: 'investigating',
    flags: { ...scenario.initialFlags },
    history: [],
    commandCount: 0,
    dangerPenalty: 0,
    hintsUsed: 0,
    reportedCause: null,
    recoveredAt: null,
  };
}

/**
 * Check whether a normalized input is handled by a builtin.
 * @param input - normalized input
 * @returns true for help / hint / causes / clear / report ...
 */
export function isBuiltin(input: string): boolean {
  const head = input.split(' ', 1)[0] ?? '';
  return (BUILTINS as readonly string[]).includes(head);
}

/**
 * Advance the game by one input. Pure: never mutates `state`.
 * @param scenario - parsed scenario
 * @param state - current state
 * @param rawInput - text as typed by the player
 * @param locale - language for engine messages (command output stays English)
 * @returns next state, output lines and whether the screen should be cleared
 */
export function step(scenario: Scenario, state: GameState, rawInput: string, locale: Locale): StepResult {
  if (state.phase === 'reported') {
    return unchanged(state, [{ kind: 'info', text: t(MESSAGES.sessionClosed, locale) }]);
  }
  const input = normalizeInput(rawInput).slice(0, MAX_INPUT_LENGTH);
  if (input === '') return unchanged(state, []);

  if (isBuiltin(input)) return runBuiltin(scenario, state, input, locale);

  const rule = selectRule(scenario.commands, input, state.flags);
  if (rule) return runRule(scenario, state, input, rule, locale);

  const dangerId = matchGlobalDanger(input);
  if (dangerId) return runGlobalDanger(state, input, dangerId, locale);

  return runUnknown(state, input);
}

/**
 * Replay a sequence of inputs from the initial state.
 * @param scenario - parsed scenario
 * @param inputs - raw inputs in order
 * @param locale - message language
 * @returns final state and every output line produced
 */
export function run(
  scenario: Scenario,
  inputs: readonly string[],
  locale: Locale = 'en',
): { state: GameState; output: OutputLine[] } {
  let state = createInitialState(scenario);
  const output: OutputLine[] = [];
  for (const input of inputs) {
    const result = step(scenario, state, input, locale);
    state = result.state;
    output.push(...result.output);
  }
  return { state, output };
}

// ---- Handlers ----

function runRule(scenario: Scenario, state: GameState, input: string, rule: Rule, locale: Locale): StepResult {
  const output: OutputLine[] = toStdout(rule.output);
  const penalty = rule.danger?.penalty ?? 0;
  const entry: HistoryEntry = rule.danger
    ? { input, kind: 'danger', ruleId: rule.id, penalty }
    : { input, kind: 'rule', ruleId: rule.id };
  if (rule.danger) {
    output.push({
      kind: 'warn',
      text: `${t(MESSAGES.dangerPrefix, locale)} (-${penalty}): ${t(rule.danger.message, locale)}`,
    });
  }

  const flags = applyEffects(state.flags, rule.effects);
  const counted: GameState = {
    ...state,
    flags,
    history: [...state.history, entry],
    commandCount: state.commandCount + 1,
    dangerPenalty: state.dangerPenalty + penalty,
  };
  return withRecoveryCheck(scenario, counted, output, locale);
}

function runGlobalDanger(state: GameState, input: string, dangerId: string, locale: Locale): StepResult {
  const entry: HistoryEntry = { input, kind: 'danger', dangerId, penalty: GLOBAL_DANGER_PENALTY };
  return {
    state: {
      ...state,
      history: [...state.history, entry],
      commandCount: state.commandCount + 1,
      dangerPenalty: state.dangerPenalty + GLOBAL_DANGER_PENALTY,
    },
    output: [{ kind: 'warn', text: t(MESSAGES.dangerBlocked, locale) }],
    clear: false,
  };
}

function runUnknown(state: GameState, input: string): StepResult {
  const name = input.split(' ', 1)[0] ?? input;
  return {
    state: {
      ...state,
      history: [...state.history, { input, kind: 'unknown' }],
      commandCount: state.commandCount + 1,
    },
    output: [{ kind: 'error', text: `bash: ${name}: ${MESSAGES.commandNotFound.en}` }],
    clear: false,
  };
}

// ---- Builtins ----

function runBuiltin(scenario: Scenario, state: GameState, input: string, locale: Locale): StepResult {
  const [head, ...args] = input.split(' ');
  const recorded: GameState = { ...state, history: [...state.history, { input, kind: 'builtin' }] };
  switch (head) {
    case 'help':
      return { state: recorded, output: toLines('info', t(MESSAGES.help, locale)), clear: false };
    case 'clear':
      return { state: recorded, output: [], clear: true };
    case 'hint':
      return runHint(scenario, recorded, locale);
    case 'causes':
      return { state: recorded, output: listCauses(scenario, locale), clear: false };
    case 'report':
      return runReport(scenario, recorded, args, locale);
    default:
      // isBuiltin() guarantees one of the cases above; reaching here is a programming error.
      throw new Error(`Unhandled builtin: ${head ?? ''}`);
  }
}

function runHint(scenario: Scenario, state: GameState, locale: Locale): StepResult {
  const hint = scenario.hints[state.hintsUsed];
  if (!hint) return { state, output: [{ kind: 'info', text: t(MESSAGES.noMoreHints, locale) }], clear: false };
  const label = `${t(MESSAGES.hintPrefix, locale)} ${state.hintsUsed + 1}/${scenario.hints.length}: `;
  return {
    state: { ...state, hintsUsed: state.hintsUsed + 1 },
    output: [{ kind: 'info', text: label + t(hint, locale) }],
    clear: false,
  };
}

function listCauses(scenario: Scenario, locale: Locale): OutputLine[] {
  const width = Math.max(...scenario.rootCauses.map((c) => c.id.length));
  return [
    { kind: 'info', text: t(MESSAGES.causesHeader, locale) },
    ...scenario.rootCauses.map((c) => ({ kind: 'info' as const, text: `  ${c.id.padEnd(width)}  ${t(c.label, locale)}` })),
  ];
}

function runReport(scenario: Scenario, state: GameState, args: readonly string[], locale: Locale): StepResult {
  const id = args[0];
  if (!id || args.length !== 1) return errorResult(state, t(MESSAGES.reportUsage, locale));
  const cause = scenario.rootCauses.find((c) => c.id === id);
  if (!cause) return errorResult(state, t(MESSAGES.reportUnknown, locale) + id);
  if (state.phase !== 'recovered') return errorResult(state, t(MESSAGES.reportTooEarly, locale));

  const correct = id === scenario.correctRootCause;
  const actual = scenario.rootCauses.find((c) => c.id === scenario.correctRootCause);
  const text = correct
    ? t(MESSAGES.reportCorrect, locale)
    : t(MESSAGES.reportWrong, locale) + (actual ? t(actual.label, locale) : scenario.correctRootCause);
  return {
    state: { ...state, phase: 'reported', reportedCause: id },
    output: [{ kind: correct ? 'success' : 'error', text }],
    clear: false,
  };
}

// ---- Helpers ----

function withRecoveryCheck(scenario: Scenario, state: GameState, output: OutputLine[], locale: Locale): StepResult {
  if (state.phase !== 'investigating' || !conditionHolds(scenario.recovery, state.flags)) {
    return { state, output, clear: false };
  }
  return {
    state: { ...state, phase: 'recovered', recoveredAt: state.history.length - 1 },
    output: [...output, { kind: 'success', text: t(MESSAGES.recovered, locale) }],
    clear: false,
  };
}

function unchanged(state: GameState, output: OutputLine[]): StepResult {
  return { state, output, clear: false };
}

function errorResult(state: GameState, text: string): StepResult {
  return { state, output: [{ kind: 'error', text }], clear: false };
}

function toStdout(text: string): OutputLine[] {
  return text === '' ? [] : toLines('stdout', text);
}

function toLines(kind: OutputLine['kind'], text: string): OutputLine[] {
  return text.split('\n').map((line) => ({ kind, text: line }));
}
