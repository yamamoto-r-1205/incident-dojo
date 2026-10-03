---
inclusion: always
---

# Testing policy

## Property-based tests are mandatory for the engine

Every behavior rule in `src/engine/` needs a fast-check property in
`tests/*.property.test.ts`.

- **Why:** the engine is driven by arbitrary player input. Example tests only cover the paths
  we imagined. Properties cover the inputs we didn't think of.
- **How:** each property maps to a numbered *Correctness Property* in
  `.kiro/specs/incident-dojo/design.md`. Put the trace in the test name:

```ts
it('Property 2: score is always within 0..100 (Validates: Requirements 5.3)', () => {
  fc.assert(fc.property(arbInputs, (inputs) => { /* ... */ }), { numRuns: 200 });
});
```

- Run at least 100 cases per property (`numRuns >= 100`).
- Generators should mix *scenario-aware* inputs (real commands from the scenario) with random
  noise so both meaningful and garbage paths are explored.

## Example tests

Use example-based tests for: concrete scenario walkthroughs (shortest solution reaches rank S),
schema accept/reject cases, i18n key parity, line-editor behavior, MCP tool handlers.

## Commands

```bash
npm test -- --run          # all tests, once (never use watch mode from the agent)
npm run validate:scenarios # schema + reachability check for scenarios/*.json
npm run check              # typecheck + lint + validators + tests
```

A task is done only when `npm run check` passes.
