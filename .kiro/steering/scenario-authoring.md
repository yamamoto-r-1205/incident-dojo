---
inclusion: fileMatch
fileMatchPattern: ['scenarios/**/*.json', 'src/engine/schema.ts']
---

# Scenario authoring rules

Loaded automatically when you open a scenario file. The schema itself lives in
`src/engine/schema.ts`; this file explains the intent.

## Hard rules

1. **Fictional data only.** Hosts like `app-01`, `web-01`, domains under `example.com`,
   IPs from `10.0.0.0/8` or `192.0.2.0/24` (TEST-NET-1). Never real customers, ticket IDs,
   account IDs or keys. AWS account IDs must be `123456789012`.
2. **Bilingual text.** Every `LocalizedText` needs both `ja` and `en`. Command `output`
   is English only.
3. **Solvable without danger.** The validator runs a BFS over flags and fails if the
   `recovery` condition is unreachable using only non-danger rules.
4. **Correct cause exists.** `correctRootCause` must be one of `rootCauses[].id`. Provide
   3–4 plausible distractors.
5. **par is honest.** `par` = number of commands a competent engineer needs including a few
   investigation commands. Shortest fix path must be `<= par`.

## Modeling tips

- Rules are evaluated top to bottom; the first rule whose `match` and `when` both hold wins.
  Put the *after-fix* variant of a command (e.g. `df -h` showing 40%) **above** the default.
- Use `matchType: "prefix"` for commands with free-form arguments
  (`journalctl -u app`, `tail /var/log/...`).
- Model the classic trap where it exists (e.g. `rm` of a log file still held open does
  **not** free disk space until the process restarts).
- Mark destructive actions with `danger` (penalty 10–40) and explain why in both languages.
- Add a `note` on the key evidence rules; notes become the postmortem timeline annotations.

## Example (abbreviated)

```json
{
  "id": "df-after-fix",
  "matchType": "exact",
  "match": ["df -h"],
  "when": { "disk_freed": true },
  "output": "/dev/xvda1  20G  8.1G  12G  41% /"
}
```

After saving a scenario, the `validate-scenario` hook runs `npm run -s validate:scenarios`.
Fix every reported issue before moving on.
