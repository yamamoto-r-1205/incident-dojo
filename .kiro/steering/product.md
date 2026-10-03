---
inclusion: always
---

# Product: Incident Dojo

Incident Dojo is a browser game for practicing incident response. The player gets a short
briefing about a fictional outage, investigates it in a pseudo terminal, applies a fix,
reports the root cause, and receives a score plus an auto-generated postmortem.

## Audience

- Junior SREs / infrastructure engineers who want safe, repeatable practice.
- Teams that want a lightweight onboarding drill without touching real systems.

## Core loop (do not change without updating the spec)

1. Pick a scenario (severity P1–P4, category linux / aws).
2. Read the briefing.
3. Investigate with shell-like commands. Outputs come from the scenario file.
4. Recover the service (scenario `recovery` condition becomes true).
5. `causes` lists candidate root causes, `report <id>` submits one. The game ends.
6. Score, rank (S/A/B/C) and a Markdown postmortem are shown and downloadable.

## Principles

- **Safety first, also in the game.** Destructive commands (`rm -rf /`, `mkfs`, terminating
  instances, …) are blocked and penalized. The same idea guards the dev workflow via the
  `danger-guard` hook.
- **Everything is fictional.** No real customer names, hostnames, private IPs, ticket IDs or
  credentials ever appear in scenarios or docs. Use `example.com`, `app-01`, `10.0.0.0/8`
  documentation-style placeholders only.
- **Bilingual.** UI, briefing, hints, root-cause labels and postmortems ship in Japanese and
  English. Command output stays English, like real CLIs.

## Source of truth

- Requirements / design / tasks: `.kiro/specs/incident-dojo/`
- Scenario format and authoring rules: `.kiro/steering/scenario-authoring.md`
