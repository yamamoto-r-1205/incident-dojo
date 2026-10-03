---
inclusion: always
---

# Tech stack and conventions

| Concern | Choice |
|---|---|
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Bundler / dev server | Vite (static output, `base: './'`) |
| Terminal UI | `@xterm/xterm` + `@xterm/addon-fit` |
| Validation | `zod` (scenario schema) |
| Tests | Vitest + fast-check |
| MCP server | `@modelcontextprotocol/sdk` over stdio, run with `tsx` |
| Hosting | GitHub Pages via GitHub Actions |

All dependencies are pinned to exact versions (`npm install -E`). Do not add a dependency
when a few lines of code will do.

## Rule 1: the engine is a pure function

`src/engine/**` exports pure functions such as `step(scenario, state, input, locale)`.

- **Why:** the same engine runs in the browser, in the MCP server and in the validation
  script. Purity also makes property-based testing possible.
- **Enforced by:** ESLint (`no-restricted-imports` / `no-restricted-globals` for
  `src/engine/**`): no `node:*`, no DOM, no `Date`, no `Math.random`.

```ts
// Good: state in, state out
const { state: next, output } = step(scenario, state, 'df -h', 'ja');

// Bad: hidden I/O inside the engine
// localStorage.setItem('score', ...)  <- belongs in src/ui or src/storage
```

## Rule 2: never render untrusted text as HTML

Scenario text and user input are written with `textContent` or to the xterm buffer only.
`innerHTML` / `outerHTML` are banned by ESLint.

## Rule 3: code style

- One responsibility per function; split long functions.
- Every exported function / type gets a JSDoc comment with params and return value.
- Separate logical sections with `// ---- Section ----` comments.
- Comments explain *why*, not *what*.
- Never swallow errors: either handle them meaningfully or rethrow with context.
