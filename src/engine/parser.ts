import type { FlagCondition, Rule } from './schema.ts';

/**
 * Normalize raw terminal input so matching never depends on spacing.
 * @param raw - text as typed by the player
 * @returns trimmed input with every whitespace run collapsed to a single space
 */
export function normalizeInput(raw: string): string {
  const trimmed = raw.trim();
  return trimmed === '' ? '' : trimmed.split(/\s+/).join(' ');
}

/**
 * Check whether a normalized input matches a rule's match strings.
 * Prefix rules match the exact string or the string followed by more arguments.
 * @param rule - scenario rule
 * @param input - normalized input
 * @returns true when the rule's `match` accepts the input
 */
export function matchesRule(rule: Pick<Rule, 'match' | 'matchType'>, input: string): boolean {
  const bare = stripSudo(input);
  return rule.match.some((m) =>
    rule.matchType === 'prefix' ? bare === m || bare.startsWith(`${m} `) : bare === m,
  );
}

/**
 * Remove a leading `sudo ` so scenarios do not need to list both variants.
 * The dojo always runs as a privileged operator.
 * @param input - normalized input
 * @returns input without the leading sudo
 */
export function stripSudo(input: string): string {
  return input.startsWith('sudo ') ? input.slice(5) : input;
}

/**
 * Evaluate a flag condition. Missing flags are treated as false.
 * @param condition - required flag values (undefined means "always true")
 * @param flags - current flags
 * @returns true when every listed flag has the required value
 */
export function conditionHolds(condition: FlagCondition | undefined, flags: Record<string, boolean>): boolean {
  if (!condition) return true;
  return Object.entries(condition).every(([flag, expected]) => (flags[flag] ?? false) === expected);
}

/**
 * Apply rule effects to flags without mutating the input object.
 * @param flags - current flags
 * @param effects - flags to set (may be undefined)
 * @returns a new flag object
 */
export function applyEffects(
  flags: Record<string, boolean>,
  effects: Record<string, boolean> | undefined,
): Record<string, boolean> {
  return effects ? { ...flags, ...effects } : flags;
}

/**
 * Find the first rule (file order) whose match and `when` both hold.
 * @param rules - scenario rules
 * @param input - normalized input
 * @param flags - current flags
 * @returns the selected rule or undefined
 */
export function selectRule(rules: readonly Rule[], input: string, flags: Record<string, boolean>): Rule | undefined {
  return rules.find((r) => matchesRule(r, input) && conditionHolds(r.when, flags));
}
