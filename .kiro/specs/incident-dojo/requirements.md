# Requirements Document

## Introduction

Incident Dojo is a static, browser-based incident response training game. The player
investigates a fictional Linux / AWS outage in a pseudo terminal, recovers the service,
reports the root cause and receives a score and a Markdown postmortem. Scenarios are JSON
files validated by tooling that is also exposed to Kiro through an MCP server and a Kiro Power.

## Glossary

- **Scenario**: a JSON file in `scenarios/` describing an outage, its commands, recovery
  condition, root causes and postmortem text.
- **Rule**: an entry in `scenario.commands[]` mapping matching input to output and flag effects.
- **Flags**: the boolean state of the fictional system (e.g. `app_running`).
- **Phase**: `investigating` → `recovered` → `reported`.
- **par**: the expected number of commands for a competent engineer.
- **Builtin**: engine-level commands `help`, `hint`, `causes`, `report <id>`, `clear`.

## Requirements

### Requirement 1: Scenario selection and briefing

**User Story:** As a trainee, I want to choose a scenario and read its briefing, so that I know
what is broken before I start.

#### Acceptance Criteria

1. WHEN the app starts THEN the system SHALL show a title screen with a language toggle and a start button.
2. WHEN the player opens the scenario list THEN the system SHALL list every shipped scenario with its title, severity (P1–P4) and category (linux / aws).
3. WHEN the player selects a scenario THEN the system SHALL show the localized briefing and a button to open the terminal.

### Requirement 2: Command input

**User Story:** As a trainee, I want to type commands like in a real shell, so that practice feels realistic.

#### Acceptance Criteria

1. WHEN the player submits input THEN the system SHALL normalize it by trimming and collapsing consecutive whitespace before matching, so that results do not depend on spacing.
2. IF the normalized input matches no builtin, no applicable rule and no global danger pattern THEN the system SHALL print `bash: <cmd>: command not found`, increase the command count by one and SHALL NOT change any other state.
3. IF the normalized input is empty THEN the system SHALL leave the state unchanged.
4. WHEN the player enters `help` THEN the system SHALL list the builtins without counting it as a command.
5. WHEN the player enters `clear` THEN the system SHALL clear the terminal without counting it as a command.

### Requirement 3: Rule evaluation

**User Story:** As a scenario author, I want declarative rules, so that I can model a system without writing code.

#### Acceptance Criteria

1. WHEN input is submitted THEN the system SHALL select the first rule, in file order, whose `match` matches the normalized input AND whose `when` condition holds for the current flags.
2. WHEN a rule with `matchType: "prefix"` is evaluated THEN the system SHALL treat it as matching if the input equals a match string or starts with the match string followed by a space.
3. WHEN a rule is selected THEN the system SHALL print its output, apply its `effects` to the flags and increase the command count by one.
4. The system SHALL be deterministic: the same scenario and the same input sequence SHALL always produce the same final state and outputs.

### Requirement 4: Recovery

**User Story:** As a trainee, I want to know when my fix worked, so that I can move on to reporting.

#### Acceptance Criteria

1. WHEN the flags satisfy the scenario `recovery` condition while the phase is `investigating` THEN the system SHALL switch the phase to `recovered` and announce it.
2. WHILE the phase is `recovered` or `reported` THE system SHALL NOT return to `investigating`, regardless of later input.

### Requirement 5: Scoring

**User Story:** As a trainee, I want a score that rewards efficient and safe work, so that I can measure progress.

#### Acceptance Criteria

1. The system SHALL start from 100 points and subtract: 2 per command above `par`, each danger penalty, 30 for a wrong or missing root cause, 5 per hint used, and 40 if the service was never recovered.
2. The system SHALL assign rank S (≥ 90), A (≥ 75), B (≥ 50) or C (< 50).
3. The system SHALL clamp the score to the range 0–100.

### Requirement 6: Dangerous operations

**User Story:** As a trainee, I want destructive commands to be stopped and penalized, so that I learn safe habits.

#### Acceptance Criteria

1. WHEN a selected rule has a `danger` definition THEN the system SHALL print its output, show the localized warning and add its penalty.
2. IF no rule matches AND the input matches a global danger pattern (e.g. `rm -rf /`, `mkfs`, `dd of=/dev/…`, `aws ec2 terminate-instances`) THEN the system SHALL block it, show a warning and add a 20-point penalty.
3. IF no danger rule or pattern was triggered during a session THEN the danger penalty SHALL be 0.

### Requirement 7: Root cause report

**User Story:** As a trainee, I want to report the root cause, so that I practice diagnosis and not only restarts.

#### Acceptance Criteria

1. WHEN the player enters `causes` THEN the system SHALL list root cause candidates with their ids.
2. IF the player enters `report <id>` while the phase is `investigating` THEN the system SHALL refuse and explain that the service must be recovered first.
3. WHEN the player enters `report <id>` with a known id while the phase is `recovered` THEN the system SHALL record it, switch the phase to `reported` and end the session; any later input SHALL leave the state unchanged.
4. IF the id is unknown or missing THEN the system SHALL print an error and SHALL NOT change the phase, flags or score-relevant counters.
5. Every non-empty input submitted before the session ends, including builtins, SHALL be recorded in the history.

### Requirement 8: Postmortem

**User Story:** As a trainee, I want an automatic postmortem, so that I practice writing one and keep a record.

#### Acceptance Criteria

1. WHEN the session ends THEN the system SHALL generate a localized Markdown postmortem with summary, severity, score, timeline, root cause, fix and prevention sections.
2. The timeline SHALL list every submitted command in the order it was entered.
3. WHEN the player clicks download THEN the system SHALL save the postmortem as a `.md` file.

### Requirement 9: Internationalization

**User Story:** As a Japanese or English speaker, I want to play in my language.

#### Acceptance Criteria

1. The system SHALL provide Japanese and English UI dictionaries with identical keys.
2. WHEN the player toggles the language THEN the system SHALL re-render the UI and persist the choice in localStorage, falling back to memory if storage is unavailable.
3. Scenario command output SHALL remain English in both languages.

### Requirement 10: Scenario validation

**User Story:** As a scenario author, I want automatic validation, so that broken scenarios never ship.

#### Acceptance Criteria

1. The validator SHALL reject scenarios that violate the schema (ids, flags, localized text, match strings).
2. The validator SHALL reject scenarios whose `recovery` condition is unreachable from `initialFlags` using non-danger rules only.
3. The validator SHALL reject scenarios whose `correctRootCause` is not in `rootCauses`, whose rule ids are not unique, or whose shortest recovery path (in commands) is longer than `par`.
4. The validator SHALL report missing `ja` / `en` text as an error.
5. WHEN a scenario file is saved by the agent THEN a Kiro hook SHALL run the validator automatically.

### Requirement 11: Terminal UI and accessibility

**User Story:** As a keyboard or screen reader user, I want the terminal to be fully operable.

#### Acceptance Criteria

1. The terminal SHALL support printable input, Backspace, Enter, ↑/↓ history and Tab completion from scenario commands and builtins.
2. The terminal SHALL enable xterm screen reader mode, and all other screens SHALL be operable by keyboard with visible focus.
3. The system SHALL never render scenario text or user input as HTML.

### Requirement 12: Kiro tooling

**User Story:** As a developer using Kiro, I want agents to read, validate and dry-run scenarios safely.

#### Acceptance Criteria

1. An MCP server SHALL expose `list_scenarios`, `get_scenario`, `validate_scenario` and `simulate_run` over stdio and SHALL NOT expose write operations.
2. `get_scenario` and `simulate_run` SHALL reject ids that do not match `^[a-z0-9-]+$`.
3. A Kiro Power SHALL package the scenario-authoring skill and the MCP server configuration.
4. Custom agents SHALL restrict file writes of the scenario author to `scenarios/**` and SHALL make the reviewer read-only.
5. A PreToolUse hook SHALL block destructive shell commands (`rm -rf`, `git push --force`, `sudo`) issued by the agent.
