# Implementation Plan

- [x] 1. Project scaffold, steering and spec
  - Vite + TypeScript + Vitest + fast-check + ESLint with pinned versions
  - Steering: product, tech, structure, testing, scenario-authoring
  - _Requirements: 9.1, 11.3_

- [x] 2. Scenario schema, validator and first scenario
  - [x] 2.1 zod schema and inferred types in `src/engine/schema.ts`
    - _Requirements: 10.1_
  - [x] 2.2 BFS reachability and semantic checks in `src/engine/reachability.ts` / `validate.ts`
    - _Requirements: 10.2, 10.3, 10.4_
  - [x] 2.3 `scripts/validate-scenarios.ts` and `scenarios/nginx-502.json`
    - _Requirements: 10.1–10.4_
  - [x] 2.4 Hooks: validate-scenario, lint-on-save, danger-guard (+ `scripts/danger-guard.mjs`)
    - _Requirements: 10.5, 12.5_

- [x] 3. Engine and property-based tests
  - [x] 3.1 Parser and rule matching
    - _Requirements: 2.1, 3.1, 3.2_
  - [x] 3.2 `step` with builtins, rules, danger patterns, unknown commands, recovery, report
    - _Requirements: 2.2–2.5, 3.3, 4.1, 4.2, 6.1, 6.2, 7.1–7.4_
  - [x] 3.3 Scoring and rank
    - _Requirements: 5.1–5.3_
  - [x] 3.4 Postmortem Markdown
    - _Requirements: 8.1, 8.2_
  - [x] 3.5 Property tests 1–8 and walkthrough examples
    - _Properties: 1–8_

- [x] 4. Browser UI
  - [x] 4.1 Line editor (history, tab completion) + Property 9
    - _Requirements: 11.1_
  - [x] 4.2 xterm terminal with screen reader mode
    - _Requirements: 11.2_
  - [x] 4.3 Screens: title, select, briefing, play, result + postmortem download
    - _Requirements: 1.1–1.3, 8.3_
  - [x] 4.4 i18n dictionaries, toggle and persistence
    - _Requirements: 9.1–9.3_
  - [x] 4.5 GitHub Pages workflow
    - _Requirements: 1.1_

- [x] 5. MCP server
  - [x] 5.1 Pure tool handlers + tests (id validation)
    - _Requirements: 12.1, 12.2_
  - [x] 5.2 stdio server and `.kiro/settings/mcp.json`
    - _Requirements: 12.1_

- [x] 6. Kiro Power `powers/incident-dojo`
  - `plugin.json`, `mcp.json`, `skills/scenario-authoring` + references, validator
  - _Requirements: 12.3_

- [x] 7. Custom agents and scenarios 2–5
  - [x] 7.1 `scenario-author` (write `scenarios/**` only) and `scenario-reviewer` (read-only)
    - _Requirements: 12.4_
  - [x] 7.2 Scenarios: disk-full, oom-killer, alb-unhealthy, rds-max-connections
    - _Requirements: 10.1–10.4_

- [ ] 8. Cloud session contribution (Kiro Web) merged via PR

- [ ] 9. Scenarios 6–10 (cert expiry, DNS, fd exhaustion, EBS full, inode exhaustion)

- [x] 10. README (ja/en), CHALLENGE.md, final verification
