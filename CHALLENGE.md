# Kiro University Challenge: evidence

Incident Dojo is a new project built for the Kiro University Challenge 2026. This file maps
every lesson to the files that demonstrate it and to a command that verifies it.

## Quick verification

```bash
npm ci
npm run check              # typecheck + lint + validate:scenarios + validate:power + 94 tests
npm run build              # static site in dist/
git log --pretty='%h %an | %s'
```

| Criterion | Evidence |
|---|---|
| Public GitHub repo, first commit on/after 2026-09-21 | `git log --reverse` |
| `.kiro/` folder | `specs/`, `steering/`, `hooks/`, `agents/`, `settings/mcp.json` |
| Works as described | `npm run check`, `npm run build`, live site via GitHub Pages |

## Lesson 1: Spec-driven development

`.kiro/specs/incident-dojo/`

- `requirements.md`: 12 requirements with user stories and **EARS** acceptance criteria (WHEN / IF / WHILE … SHALL).
- `design.md`: architecture and state-machine diagrams, interfaces, data models, and 9 numbered **Correctness Properties**, each with `Validates: Requirements x.y`.
- `tasks.md`: the implementation plan, with every task traced to its requirements.

## Lesson 2: Steering

`.kiro/steering/`

| File | Inclusion | Purpose |
|---|---|---|
| `product.md` | always | Core loop, safety-first and fictional-data principles |
| `tech.md` | always | Stack; **the engine must be pure**, no `innerHTML`, code style |
| `structure.md` | always | Directory layout, placement and naming rules |
| `testing.md` | always | Property tests are mandatory, traced to design properties |
| `scenario-authoring.md` | `fileMatch` on `scenarios/**/*.json` | Scenario rules, loaded only when editing scenarios |

The rules are enforced, not only documented. For example, the "pure engine" rule in `tech.md`
is backed by ESLint `no-restricted-imports` / `no-restricted-globals` for `src/engine/**`
(`eslint.config.js`).

## Lesson 3: Hooks

`.kiro/hooks/`. All of them are `command` actions, so they are deterministic and use no credits.

| File | Trigger | Matcher | Action |
|---|---|---|---|
| `validate-scenario.json` | `PostFileSave`, `PostFileCreate` | `scenarios/[^/]+\.json$` | `npm run -s validate:scenarios` (schema + BFS reachability) |
| `lint-on-save.json` | `PostFileSave` | `\.(ts\|mjs\|js)$` | `npm run -s lint` |
| `danger-guard.json` | `PreToolUse` | `execute_bash\|shell` | `scripts/danger-guard.mjs`, **exit 2 blocks** `rm -rf`, `git push --force`, `git reset --hard`, `git clean -f`, `sudo` |
| `test-after-task.json` | `PostTaskExec` | – | `npm run -s check` after each spec task |

`danger-guard` brings the in-game "dangerous operations are blocked" rule into the dev
workflow. It is tested in `tests/dangerGuard.test.ts`.

## Lesson 4: Property-based testing

fast-check + Vitest. Each property runs at least 200 cases over **every shipped scenario**.

| Property (design.md) | Test | Validates |
|---|---|---|
| 1 Determinism | `tests/engine.property.test.ts` | Req 3.4 |
| 2 Score bounds and rank thresholds | same | Req 5.2, 5.3 |
| 3 Unknown command isolation | same | Req 2.2 |
| 4 Recovery is monotonic | same | Req 4.2 |
| 5 No danger, no penalty | same | Req 6.3 |
| 6 Timeline order | same | Req 8.2 |
| 7 Whitespace insensitivity | same | Req 2.1 |
| 8 Report is terminal | same | Req 7.3 |
| 9 Line editor round-trip | `tests/lineEditor.property.test.ts` | Req 11.1 |

Example tests complement the properties:

- every scenario's shortest solution reaches rank S,
- every scenario's trap path does **not** recover,
- schema reject cases, i18n key parity, and the MCP handlers.

## Lesson 5: Powers

`powers/incident-dojo/` is a self-authored power in the Agent Plugins format, imported into
this workspace with **Powers panel → Add Custom Power → Import power from a folder**.

- `plugin.json`: the required manifest (`$schema`, `name`, `version`, `description`, `author`, `keywords`). The keywords include `incident`, `障害対応` and `postmortem`, so mentioning those topics activates the power.
- `skills/scenario-authoring/SKILL.md`: a step-by-step authoring workflow.
- `skills/scenario-authoring/references/`: incident patterns, a schema cheatsheet and a postmortem template.
- `mcp.json`: bundles the incident-dojo MCP server, so the power brings both knowledge and tools.

## Lesson 6: MCP

`mcp-server/src/` is a self-written stdio server built on `@modelcontextprotocol/sdk`, and it reuses the game engine.

| Tool | Purpose |
|---|---|
| `list_scenarios` | ids, titles, severity, category, par, validity |
| `get_scenario` | parsed scenario + shortest non-danger fix (BFS) |
| `validate_scenario` | validate JSON text without writing anything |
| `simulate_run` | replay commands with the real engine; score, transcript and postmortem |

Security choices:

- Every tool is read-only and carries the `readOnlyHint` annotation.
- Ids are checked against `^[a-z0-9-]+$` before any file access, which blocks path traversal (tested).
- Input sizes are capped.
- Logs go to stderr only.

Configuration and scoping:

- Registered in `.kiro/settings/mcp.json`. `simulate_run` is deliberately left out of `autoApprove`.
- The server is scoped per agent: the reviewer agent gets only 4 specific MCP tools.

Tests: `tests/mcpTools.test.ts` covers the handlers, and `tests/mcpServer.test.ts` runs a real stdio client against the server.

## Lesson 7: Custom agents

`.kiro/agents/`

| Agent | Tools | Permissions | Context |
|---|---|---|---|
| `scenario-author` | read, write, shell, `@incident-dojo` | `fs_write` allowed **only** on `scenarios/**` (src, tests, .kiro, package.json denied). Shell allowed only for `npm run validate*` / `npm test*`; `rm -rf`, `git push`, `git reset`, `sudo` denied. Read-only MCP tools pre-approved | all steering + the Power's skill (`skill://`) |
| `scenario-reviewer` | read + 4 named MCP tools | `fs_write` `**` deny, `shell` `*` deny, `web_fetch` deny | product/scenario steering + skill; findings classified as MUST / SHOULD / IMO |

Both agents load their system prompts from `.kiro/agents/prompts/*.md` and set
`welcomeMessage` and `keyboardShortcut`. Together they connect powers (skills), MCP and hooks:
a file the author writes fires the `validate-scenario` hook.

Scenarios 2–5 (`disk-full`, `oom-killer`, `alb-unhealthy`, `rds-max-connections`) follow the
same skill and pass the same validator and hook that the author agent uses.

## Bonus 1: Kiro Web / cloud sessions

_To be completed:_ a cloud session at app.kiro.dev on this repository adds a scenario and
opens a pull request. Verify the commit author with
`git log --pretty='%h %an <%ae> | %s'`. The whole `.kiro/` configuration is committed,
so the hooks, agents and steering travel into the cloud sandbox with the clone.

## Bonus 2: Package a Kiro power

`powers/incident-dojo/` is packaged for sharing as described above.

- `npm run validate:power` checks the manifest, `mcp.json` and the SKILL.md frontmatter. It is tested in `tests/power.test.ts`.
- Others can install it from this public repository with **Add Custom Power → Import power from GitHub**.
