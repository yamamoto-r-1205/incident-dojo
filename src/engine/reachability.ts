import { isBuiltin } from './engine.ts';
import { applyEffects, conditionHolds, selectRule } from './parser.ts';
import type { Scenario } from './schema.ts';

// Upper bound on explored flag states; scenarios are small, this only guards against mistakes.
const MAX_STATES = 4096;

interface Node {
  readonly flags: Record<string, boolean>;
  readonly path: readonly string[];
}

/**
 * Find the shortest sequence of commands that recovers the service without
 * triggering any danger rule. Uses the same rule selection as the engine, so the
 * returned commands are guaranteed to replay correctly.
 * @param scenario - parsed scenario
 * @returns concrete commands in order, or null when recovery is unreachable
 */
export function findRecoveryPath(scenario: Scenario): string[] | null {
  const flagNames = collectFlagNames(scenario);
  const candidates = candidateInputs(scenario);
  const start = normalizeFlags(scenario.initialFlags, flagNames);
  if (conditionHolds(scenario.recovery, start)) return [];

  const seen = new Set<string>([keyOf(start, flagNames)]);
  const queue: Node[] = [{ flags: start, path: [] }];

  while (queue.length > 0 && seen.size <= MAX_STATES) {
    const node = queue.shift() as Node;
    for (const input of candidates) {
      const rule = selectRule(scenario.commands, input, node.flags);
      if (!rule || rule.danger || !rule.effects) continue;
      const next = applyEffects(node.flags, rule.effects);
      const key = keyOf(next, flagNames);
      if (seen.has(key)) continue;
      seen.add(key);
      const path = [...node.path, input];
      if (conditionHolds(scenario.recovery, next)) return path;
      queue.push({ flags: next, path });
    }
  }
  return null;
}

/**
 * Every flag name mentioned anywhere in the scenario.
 * @param scenario - parsed scenario
 * @returns sorted, de-duplicated flag names
 */
export function collectFlagNames(scenario: Scenario): string[] {
  const names = new Set<string>(Object.keys(scenario.initialFlags));
  Object.keys(scenario.recovery).forEach((f) => names.add(f));
  for (const rule of scenario.commands) {
    Object.keys(rule.when ?? {}).forEach((f) => names.add(f));
    Object.keys(rule.effects ?? {}).forEach((f) => names.add(f));
  }
  return [...names].sort();
}

// ---- Helpers ----

function candidateInputs(scenario: Scenario): string[] {
  const all = scenario.commands.flatMap((r) => r.match);
  return [...new Set(all)].filter((input) => !isBuiltin(input));
}

function normalizeFlags(flags: Record<string, boolean>, names: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(names.map((n) => [n, flags[n] ?? false]));
}

function keyOf(flags: Record<string, boolean>, names: readonly string[]): string {
  return names.map((n) => (flags[n] ? '1' : '0')).join('');
}
