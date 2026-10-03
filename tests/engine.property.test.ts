import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { matchGlobalDanger } from '../src/engine/danger.ts';
import { createInitialState, isBuiltin, run, step } from '../src/engine/engine.ts';
import { normalizeInput, selectRule } from '../src/engine/parser.ts';
import { buildTimeline } from '../src/engine/postmortem.ts';
import { computeScore, rankFor } from '../src/engine/scoring.ts';
import type { GameState } from '../src/engine/types.ts';
import { arbInput, arbRespaced, arbSession, loadShippedScenarios } from './helpers.ts';

const shipped = loadShippedScenarios();
const scenarios = shipped.map((s) => s.scenario);
const RUNS = { numRuns: 200 };

describe('engine correctness properties', () => {
  it('Property 1: same scenario + same inputs => same result (Validates: Requirements 3.4)', () => {
    fc.assert(
      fc.property(arbSession(scenarios), fc.constantFrom('ja' as const, 'en' as const), ({ scenario, inputs }, locale) => {
        expect(run(scenario, inputs, locale)).toEqual(run(scenario, inputs, locale));
      }),
      RUNS,
    );
  });

  it('Property 2: score is an integer in 0..100 and rank matches thresholds (Validates: Requirements 5.2, 5.3)', () => {
    fc.assert(
      fc.property(arbSession(scenarios), ({ scenario, inputs }) => {
        const { score, rank } = computeScore(scenario, run(scenario, inputs).state);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(rank).toBe(rankFor(score));
        expect(rank).toBe(score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 50 ? 'B' : 'C');
      }),
      RUNS,
    );
  });

  it('Property 3: unknown commands only bump commandCount and history (Validates: Requirements 2.2)', () => {
    const arbUnknown = fc.stringMatching(/^[a-z]{2,8}$/).map((s) => `xq${s}`);
    fc.assert(
      fc.property(arbSession(scenarios), arbUnknown, ({ scenario, inputs }, unknown) => {
        const before = run(scenario, inputs).state;
        fc.pre(before.phase !== 'reported');
        fc.pre(!isBuiltin(unknown) && !selectRule(scenario.commands, unknown, before.flags) && !matchGlobalDanger(unknown));
        const after = step(scenario, before, unknown, 'en').state;
        expect(after).toEqual({
          ...before,
          commandCount: before.commandCount + 1,
          history: [...before.history, { input: unknown, kind: 'unknown' }],
        });
      }),
      RUNS,
    );
  });

  it('Property 4: once recovered, the phase never returns to investigating (Validates: Requirements 4.2)', () => {
    fc.assert(
      fc.property(arbSession(scenarios), ({ scenario, inputs }) => {
        let state: GameState = createInitialState(scenario);
        let left = false;
        for (const input of inputs) {
          state = step(scenario, state, input, 'en').state;
          if (state.phase !== 'investigating') left = true;
          if (left) expect(state.phase).not.toBe('investigating');
        }
      }),
      RUNS,
    );
  });

  it('Property 5: no danger entries => zero danger penalty; otherwise the sum of penalties (Validates: Requirements 6.3)', () => {
    fc.assert(
      fc.property(arbSession(scenarios), ({ scenario, inputs }) => {
        const { state } = run(scenario, inputs);
        const dangers = state.history.filter((h) => h.kind === 'danger');
        const sum = dangers.reduce((acc, h) => acc + (h.penalty ?? 0), 0);
        if (dangers.length === 0) expect(state.dangerPenalty).toBe(0);
        expect(state.dangerPenalty).toBe(sum);
      }),
      RUNS,
    );
  });

  it('Property 6: timeline lists every non-empty input in order (Validates: Requirements 8.2)', () => {
    fc.assert(
      fc.property(arbSession(scenarios, { includeReport: false }), ({ scenario, inputs }) => {
        const { state } = run(scenario, inputs);
        const expected = inputs.map(normalizeInput).filter((s) => s !== '');
        expect(buildTimeline(scenario, state).map((e) => e.input)).toEqual(expected);
      }),
      RUNS,
    );
  });

  it('Property 7: extra whitespace never changes the outcome (Validates: Requirements 2.1)', () => {
    const arbPair = fc.constantFrom(...scenarios).chain((scenario) =>
      fc.array(arbInput(scenario), { maxLength: 25 }).chain((inputs) =>
        fc.tuple(...inputs.map(arbRespaced)).map((respaced) => ({ scenario, inputs, respaced: respaced as string[] })),
      ),
    );
    fc.assert(
      fc.property(arbPair, ({ scenario, inputs, respaced }) => {
        expect(run(scenario, respaced).state).toEqual(run(scenario, inputs).state);
      }),
      RUNS,
    );
  });

  it('Property 8: after reporting, any input leaves the state unchanged (Validates: Requirements 7.3)', () => {
    const arbAfter = fc
      .constantFrom(...shipped)
      .chain((s) => fc.array(arbInput(s.scenario), { minLength: 1, maxLength: 15 }).map((tail) => ({ ...s, tail })));
    fc.assert(
      fc.property(arbAfter, ({ scenario, solution, tail }) => {
        const reported = run(scenario, [...solution, `report ${scenario.correctRootCause}`]).state;
        expect(reported.phase).toBe('reported');
        expect(run(scenario, [...solution, `report ${scenario.correctRootCause}`, ...tail]).state).toEqual(reported);
      }),
      RUNS,
    );
  });
});
