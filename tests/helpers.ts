import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import fc from 'fast-check';
import { BUILTINS } from '../src/engine/engine.ts';
import type { Scenario } from '../src/engine/schema.ts';
import { validateScenario } from '../src/engine/validate.ts';

// ---- Shipped scenarios ----

const SCENARIO_DIR = path.resolve(import.meta.dirname, '../scenarios');

/**
 * Load and validate every shipped scenario synchronously.
 * @returns parsed scenarios with their shortest solutions
 * @throws Error when any shipped scenario is invalid (tests should fail loudly)
 */
export function loadShippedScenarios(): { scenario: Scenario; solution: string[] }[] {
  return readdirSync(SCENARIO_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const json: unknown = JSON.parse(readFileSync(path.join(SCENARIO_DIR, file), 'utf8'));
      const result = validateScenario(json, file.replace(/\.json$/, ''));
      if (!result.ok) throw new Error(`${file}: ${JSON.stringify(result.issues)}`);
      return { scenario: result.scenario, solution: result.solution };
    });
}

/**
 * Read a shipped scenario as raw JSON (for mutation in negative tests).
 * @param id - scenario id
 * @returns a fresh deep copy of the JSON value
 */
export function rawScenario(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(SCENARIO_DIR, `${id}.json`), 'utf8')) as Record<string, unknown>;
}

// ---- Arbitraries ----

/** Random lowercase noise that looks like a command. */
export const arbNoise = fc.stringMatching(/^[a-z]{1,8}( [a-z0-9./-]{1,10}){0,2}$/);

/**
 * Inputs mixing real scenario commands, builtins, report attempts and noise.
 * @param scenario - scenario to draw commands from
 * @param opts.includeReport - whether `report <id>` inputs may be generated
 * @returns arbitrary for a single raw input
 */
export function arbInput(scenario: Scenario, opts: { includeReport: boolean } = { includeReport: true }): fc.Arbitrary<string> {
  const commands = [...new Set(scenario.commands.flatMap((r) => r.match))];
  const builtins = BUILTINS.filter((b) => b !== 'report');
  const reports = scenario.rootCauses.map((c) => `report ${c.id}`);
  const parts: fc.Arbitrary<string>[] = [
    fc.constantFrom(...commands),
    fc.constantFrom(...commands),
    fc.constantFrom(...builtins),
    arbNoise.filter((s) => !s.startsWith('report')),
    fc.constantFrom('', '   '),
  ];
  if (opts.includeReport) parts.push(fc.constantFrom(...reports));
  return fc.oneof(...parts);
}

/**
 * A scenario together with a sequence of inputs for it.
 * @param scenarios - candidate scenarios
 * @param opts.includeReport - whether report inputs may be generated
 * @returns arbitrary of `{ scenario, inputs }`
 */
export function arbSession(
  scenarios: readonly Scenario[],
  opts: { includeReport: boolean } = { includeReport: true },
): fc.Arbitrary<{ scenario: Scenario; inputs: string[] }> {
  return fc
    .constantFrom(...scenarios)
    .chain((scenario) =>
      fc.array(arbInput(scenario, opts), { maxLength: 40 }).map((inputs) => ({ scenario, inputs })),
    );
}

/**
 * Re-space an input with random extra whitespace (leading, trailing, between tokens).
 * @param input - original input
 * @returns arbitrary producing a re-spaced variant
 */
export function arbRespaced(input: string): fc.Arbitrary<string> {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const ws = fc.constantFrom(' ', '  ', '\t', ' \t ');
  return fc
    .tuple(fc.constantFrom('', ' ', '\t'), fc.array(ws, { minLength: tokens.length, maxLength: tokens.length }), fc.constantFrom('', ' ', '\t'))
    .map(([lead, gaps, trail]) => lead + tokens.map((tok, i) => (i === 0 ? tok : `${gaps[i] ?? ' '}${tok}`)).join('') + trail);
}
