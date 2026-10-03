# Scenario schema cheatsheet

Authoritative schema: `src/engine/schema.ts` (zod, strict, unknown keys rejected).

```jsonc
{
  "id": "disk-full",                 // ^[a-z0-9-]+$, must equal the file name
  "version": 1,
  "title":    { "ja": "…", "en": "…" },
  "briefing": { "ja": "…", "en": "…" },
  "severity": "P2",                   // P1..P4
  "category": "linux",                // linux | aws
  "host": "app-01",                   // shown in the prompt: oncall@app-01
  "par": 8,                           // >= shortest fix length
  "initialFlags": { "disk_freed": false },   // declare EVERY flag used anywhere
  "commands": [                       // first match (file order) wins
    {
      "id": "df-after",               // unique
      "match": ["df -h", "df"],       // whitespace-normalized strings
      "matchType": "exact",           // exact (default) | prefix
      "when": { "disk_freed": true }, // optional flag condition
      "output": "…English CLI output…",
      "effects": { "disk_freed": true },   // optional
      "danger": { "penalty": 20, "message": { "ja": "…", "en": "…" } }, // optional
      "note": { "ja": "…", "en": "…" }     // optional, shown in the postmortem timeline
    }
  ],
  "recovery": { "disk_freed": true, "app_running": true },
  "hints": [{ "ja": "…", "en": "…" }],
  "rootCauses": [{ "id": "debug-log", "label": { "ja": "…", "en": "…" } }],
  "correctRootCause": "debug-log",
  "postmortem": { "summary": {…}, "fix": {…}, "prevention": {…} }
}
```

## Engine behavior to keep in mind

- Input is trimmed and whitespace-collapsed before matching; a leading `sudo ` is ignored.
- `prefix` matches `m` exactly or `m` followed by a space and more arguments.
- Builtins `help`, `hint`, `causes`, `report`, `clear` cannot be used in `match`.
- Unknown input prints `bash: <cmd>: command not found` and costs one command.
- Global danger patterns (`rm -rf /`, `mkfs`, `dd of=/dev/…`, `aws ec2 terminate-instances`,
  `drop database`, …) are blocked in every scenario with -20.
- Rules without `effects` never change state; the BFS uses only non-danger rules with effects.

## Scoring

100 − 2 × (commands over par) − danger penalties − 30 (wrong/missing cause)
− 5 × hints − 40 (never recovered), clamped to 0..100. S ≥ 90, A ≥ 75, B ≥ 50.
