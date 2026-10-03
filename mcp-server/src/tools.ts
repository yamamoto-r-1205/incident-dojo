/**
 * Pure-ish MCP tool handlers (file reads only, no writes). Kept separate from the
 * transport wiring in index.ts so they can be unit-tested directly.
 */
import { run } from '../../src/engine/engine.ts';
import { renderPostmortem } from '../../src/engine/postmortem.ts';
import { ID_PATTERN, type Locale } from '../../src/engine/schema.ts';
import { computeScore } from '../../src/engine/scoring.ts';
import { validateScenario } from '../../src/engine/validate.ts';
import { listScenarioIds, loadScenarioFile } from '../../src/node/scenarioRepository.ts';

// ---- Result envelope ----

/** MCP CallTool result shape used by every handler. */
export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true });

// Limits keep a misbehaving agent from sending huge payloads through the transport.
export const LIMITS = { maxJsonChars: 200_000, maxCommands: 100, maxTranscriptLines: 400 } as const;

// ---- Handlers ----

/**
 * List every scenario with summary metadata and validity.
 * @param dir - scenarios directory
 * @returns tool result with an array of summaries
 */
export async function listScenarios(dir: string): Promise<ToolResult> {
  const ids = await listScenarioIds(dir);
  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        const { result } = await loadScenarioFile(id, dir);
        if (!result.ok) return { id, valid: false, issues: result.issues.length };
        const s = result.scenario;
        return { id, valid: true, title: s.title, severity: s.severity, category: s.category, par: s.par };
      } catch (err) {
        return { id, valid: false, error: (err as Error).message };
      }
    }),
  );
  return ok(items);
}

/**
 * Get one scenario (parsed, with defaults) plus its shortest non-danger fix.
 * @param dir - scenarios directory
 * @param id - scenario id (must match ^[a-z0-9-]+$)
 * @returns tool result with the scenario, or an error result
 */
export async function getScenario(dir: string, id: string): Promise<ToolResult> {
  if (!ID_PATTERN.test(id)) return fail(`Invalid scenario id: ${JSON.stringify(id)}`);
  try {
    const { result } = await loadScenarioFile(id, dir);
    if (!result.ok) return fail(`Scenario "${id}" is invalid:\n${formatIssues(result.issues)}`);
    return ok({ scenario: result.scenario, shortestFix: result.solution });
  } catch (err) {
    return fail(`Could not load scenario "${id}": ${(err as Error).message}`);
  }
}

/**
 * Validate scenario JSON text without saving it anywhere.
 * @param json - JSON document as a string
 * @returns tool result `{ ok, issues, shortestFix }`
 */
export function validateScenarioJson(json: string): ToolResult {
  if (json.length > LIMITS.maxJsonChars) return fail(`JSON is too large (> ${LIMITS.maxJsonChars} chars)`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return ok({ ok: false, issues: [{ path: '(json)', message: (err as Error).message }] });
  }
  const result = validateScenario(parsed);
  return ok(result.ok ? { ok: true, issues: [], shortestFix: result.solution } : { ok: false, issues: result.issues });
}

/**
 * Dry-run a command sequence against a scenario and score it.
 * @param dir - scenarios directory
 * @param id - scenario id
 * @param commands - inputs in order
 * @param locale - language for messages and the postmortem
 * @returns tool result with phase, score, transcript and postmortem
 */
export async function simulateRun(dir: string, id: string, commands: string[], locale: Locale): Promise<ToolResult> {
  if (!ID_PATTERN.test(id)) return fail(`Invalid scenario id: ${JSON.stringify(id)}`);
  if (commands.length > LIMITS.maxCommands) return fail(`Too many commands (> ${LIMITS.maxCommands})`);
  try {
    const { result } = await loadScenarioFile(id, dir);
    if (!result.ok) return fail(`Scenario "${id}" is invalid:\n${formatIssues(result.issues)}`);
    const scenario = result.scenario;
    const { state, output } = run(scenario, commands, locale);
    const score = computeScore(scenario, state);
    return ok({
      phase: state.phase,
      score: score.score,
      rank: score.rank,
      penalties: score.penalties,
      rootCauseCorrect: score.rootCauseCorrect,
      commandCount: state.commandCount,
      par: scenario.par,
      flags: state.flags,
      transcript: output
        .slice(0, LIMITS.maxTranscriptLines)
        .map((l) => `[${l.kind}] ${l.text}`)
        .join('\n'),
      transcriptTruncated: output.length > LIMITS.maxTranscriptLines,
      postmortem: renderPostmortem(scenario, state, locale),
    });
  } catch (err) {
    return fail(`Could not simulate "${id}": ${(err as Error).message}`);
  }
}

function formatIssues(issues: readonly { path: string; message: string }[]): string {
  return issues.map((i) => `- ${i.path}: ${i.message}`).join('\n');
}
