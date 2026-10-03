# Postmortem template

Incident Dojo generates postmortems with this structure from `postmortem.summary`,
`fix`, `prevention` and the player's timeline. Write scenario texts so they slot in.

```markdown
# Postmortem: <title>

## Summary
What broke, why, and the user impact, in 2–3 sentences.
- Severity: P1–P4 (category)

## Timeline
1. `command` — key evidence found
2. …
N. `fix command` — ← recovered

## Root cause
The underlying cause (ask "why?" until you reach a process or design gap, not a person).

## Fix
What restored service.

## Prevention
- 2–3 concrete actions: guardrail, detection, process
```

## Writing tips

- Blameless: describe systems and processes, never individuals.
- Summary answers: what, since when, impact, cause.
- Prevention items should be verifiable (an alarm, a check in CI, a config limit).

## End-of-incident checklist (real incidents)

- [ ] Service verified healthy, alarms back to OK
- [ ] Stakeholders notified of recovery
- [ ] Temporary workarounds have follow-up tickets
- [ ] Postmortem review scheduled
