---
name: scenario-authoring
description: Create, validate and dry-run Incident Dojo training scenarios (scenarios/*.json). Use when asked to add or review an incident / 障害シナリオ, model a Linux or AWS outage for the dojo, or check a scenario's difficulty and postmortem.
---

# Incident Dojo scenario authoring

A scenario is a JSON file describing a fictional outage: what the player sees for each
command, how flags change, what "recovered" means, the root cause candidates and the
postmortem text. The game engine is declarative, so no code changes are needed.

The MCP tools come from the `incident-dojo` server bundled with this power. It must be
started from the Incident Dojo repository root (it reads `scenarios/` relative to the
repo, or `INCIDENT_DOJO_SCENARIOS` if set).

## Step 1: Avoid duplicates

Call `list_scenarios`. Pick a failure mode that is not covered yet and fits the
category balance (linux / aws).

## Step 2: Pick a pattern

Open `references/incident-patterns.md` and choose a pattern. Each pattern lists:
symptoms, the evidence commands, the classic trap and the correct fix. Every good
scenario has **one trap** where the obvious action does not work.

## Step 3: Write the JSON

Follow `references/schema-cheatsheet.md` and copy the structure of an existing file
(`get_scenario` with `nginx-502` is the reference). Rules of thumb:

- Fictional data only: hosts like `web-01`, domains under `example.com`, IPs in
  `10.0.0.0/8` or `192.0.2.0/24`, AWS account `123456789012`.
- Both `ja` and `en` for every LocalizedText. Command `output` is English.
- Put the after-fix variant of a command **above** the default rule (first match wins).
- 3 or more hints, 4 root causes (1 correct + 3 plausible distractors), at least one
  `danger` rule, `note` on key evidence.
- `par` = shortest fix + 3 to 6 investigation commands.

## Step 4: Validate

Call `validate_scenario` with the full JSON text. Fix every issue. The validator checks
the schema, unique ids, declared flags, builtin shadowing, the correct root cause, BFS
reachability without danger rules, and `shortest fix <= par`.

## Step 5: Dry-run

Save the file as `scenarios/<id>.json` (the `validate-scenario` hook re-runs the
validator automatically), then call `simulate_run`:

1. The shortest fix from `get_scenario` + `report <correct-id>` must reach rank **S**.
2. The trap path (e.g. restarting before fixing the cause) must **not** recover.
3. A danger command must add its penalty.

Read the generated postmortem in both `ja` and `en`; it should read like a real one.

## Step 6: Run the tests

```bash
npm test -- --run
```

`tests/engine.test.ts` automatically checks that every shipped scenario reaches rank S
and renders postmortems; the property tests run against every scenario too.

## Done checklist

- [ ] `npm run validate:scenarios` passes
- [ ] trap path verified with `simulate_run`
- [ ] no real names, hosts, IPs, account ids or ticket ids
- [ ] postmortem `prevention` has 2–3 concrete actions
