---
inclusion: always
---

# Project structure

```
src/engine/      Pure game logic (types, schema, parser, engine, scoring, postmortem, validation)
src/i18n/        ja.json / en.json dictionaries + tiny translator
src/ui/          xterm terminal wrapper, line editor, screens (DOM only here)
src/scenarios.ts Browser-side scenario loader (import.meta.glob)
scenarios/       One JSON file per scenario, filename === scenario id
scripts/         Node scripts: validate-scenarios.ts, validate-power.ts, danger-guard.mjs
mcp-server/src/  MCP server (stdio) exposing scenario tools to Kiro
powers/          Self-authored Kiro Power (Agent Plugins format)
tests/           *.test.ts (examples) and *.property.test.ts (fast-check)
.kiro/           specs, steering, hooks, agents, MCP settings
```

## Placement rules

- New game rules go into `src/engine/` and must be covered by a property test.
- Anything touching `document`, `window` or `localStorage` lives under `src/ui/`.
- Node-only helpers (fs) live under `scripts/` or `mcp-server/` and import the engine, never
  the other way around.
- Scenario files: `scenarios/<id>.json`, where `<id>` matches `^[a-z0-9-]+$`.

## Naming

- Files: `camelCase.ts` for modules, `kebab-case.json` for scenarios and hooks.
- Tests: `tests/<module>.test.ts`, `tests/<module>.property.test.ts`.
- Flags inside scenarios: `snake_case` (`^[a-z][a-z0-9_]*$`).
