import { BUILTINS } from './engine.ts';
import { conditionHolds } from './parser.ts';
import { collectFlagNames, findRecoveryPath } from './reachability.ts';
import { type Scenario, scenarioSchema } from './schema.ts';

/** A single validation problem. */
export interface ValidationIssue {
  /** JSON path such as `commands.3.match.0`, or `(scenario)` for cross-field checks. */
  readonly path: string;
  readonly message: string;
}

/** Result of validating one scenario document. */
export type ValidationResult =
  | { readonly ok: true; readonly scenario: Scenario; readonly solution: string[]; readonly issues: [] }
  | { readonly ok: false; readonly issues: ValidationIssue[] };

/**
 * Validate an unknown JSON value as a scenario: schema first, then semantic checks
 * (unique ids, declared flags, builtin shadowing, root cause, reachability, par).
 * @param json - parsed JSON value
 * @param expectedId - optional id the scenario must have (e.g. derived from the file name)
 * @returns ok + parsed scenario + shortest solution, or the list of issues
 */
export function validateScenario(json: unknown, expectedId?: string): ValidationResult {
  const parsed = scenarioSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.') || '(root)', message: i.message })),
    };
  }
  const scenario = parsed.data;
  const issues = semanticIssues(scenario, expectedId);
  if (issues.length > 0) return { ok: false, issues };

  const solution = findRecoveryPath(scenario);
  if (!solution) {
    return { ok: false, issues: [issue('recovery', 'recovery is unreachable from initialFlags without danger rules')] };
  }
  if (solution.length > scenario.par) {
    return {
      ok: false,
      issues: [issue('par', `shortest recovery path needs ${solution.length} commands but par is ${scenario.par}`)],
    };
  }
  return { ok: true, scenario, solution, issues: [] };
}

// ---- Semantic checks ----

function semanticIssues(s: Scenario, expectedId: string | undefined): ValidationIssue[] {
  return [
    ...checkExpectedId(s, expectedId),
    ...checkUnique(s.commands.map((r) => r.id), 'commands', 'rule id'),
    ...checkUnique(s.rootCauses.map((c) => c.id), 'rootCauses', 'root cause id'),
    ...checkCorrectCause(s),
    ...checkDeclaredFlags(s),
    ...checkBuiltinShadowing(s),
    ...checkNotInitiallyRecovered(s),
  ];
}

function checkExpectedId(s: Scenario, expectedId: string | undefined): ValidationIssue[] {
  return expectedId !== undefined && s.id !== expectedId
    ? [issue('id', `id "${s.id}" must match the file name "${expectedId}"`)]
    : [];
}

function checkUnique(ids: readonly string[], path: string, what: string): ValidationIssue[] {
  const seen = new Set<string>();
  const out: ValidationIssue[] = [];
  ids.forEach((id, i) => {
    if (seen.has(id)) out.push(issue(`${path}.${i}.id`, `duplicate ${what} "${id}"`));
    seen.add(id);
  });
  return out;
}

function checkCorrectCause(s: Scenario): ValidationIssue[] {
  return s.rootCauses.some((c) => c.id === s.correctRootCause)
    ? []
    : [issue('correctRootCause', `"${s.correctRootCause}" is not one of rootCauses[].id`)];
}

// Requiring every flag in initialFlags catches typos such as `app_runing`.
function checkDeclaredFlags(s: Scenario): ValidationIssue[] {
  const declared = new Set(Object.keys(s.initialFlags));
  return collectFlagNames(s)
    .filter((f) => !declared.has(f))
    .map((f) => issue('initialFlags', `flag "${f}" is used but not declared in initialFlags`));
}

function checkBuiltinShadowing(s: Scenario): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  s.commands.forEach((rule, i) =>
    rule.match.forEach((m, j) => {
      const head = m.split(' ', 1)[0] ?? '';
      if ((BUILTINS as readonly string[]).includes(head)) {
        out.push(issue(`commands.${i}.match.${j}`, `"${m}" shadows the builtin "${head}"`));
      }
    }),
  );
  return out;
}

function checkNotInitiallyRecovered(s: Scenario): ValidationIssue[] {
  return conditionHolds(s.recovery, s.initialFlags)
    ? [issue('recovery', 'recovery condition already holds in initialFlags')]
    : [];
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}
