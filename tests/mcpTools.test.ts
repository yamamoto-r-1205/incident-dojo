import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getScenario, listScenarios, simulateRun, validateScenarioJson } from '../mcp-server/src/tools.ts';
import { rawScenario } from './helpers.ts';

const DIR = path.resolve(import.meta.dirname, '../scenarios');
const body = (r: { content: { text: string }[] }) => JSON.parse(r.content[0]!.text) as Record<string, unknown>;

describe('MCP tool handlers', () => {
  it('list_scenarios returns valid summaries', async () => {
    const r = await listScenarios(DIR);
    const items = JSON.parse(r.content[0]!.text) as { id: string; valid: boolean }[];
    expect(items.find((i) => i.id === 'nginx-502')).toMatchObject({ valid: true, severity: 'P2' });
  });

  it('get_scenario returns the scenario and shortest fix', async () => {
    const r = await getScenario(DIR, 'nginx-502');
    expect(r.isError).toBeUndefined();
    expect((body(r).shortestFix as string[]).length).toBe(2);
  });

  it.each(['../package', 'nginx-502/../../x', 'NGINX', '', 'a b'])('get_scenario rejects id %j (path traversal guard)', async (id) => {
    const r = await getScenario(DIR, id);
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toMatch(/Invalid scenario id/);
  });

  it('get_scenario reports a missing file as an error result, not a throw', async () => {
    expect((await getScenario(DIR, 'does-not-exist')).isError).toBe(true);
  });

  it('validate_scenario accepts a good document and reports issues for a bad one', () => {
    expect(body(validateScenarioJson(JSON.stringify(rawScenario('nginx-502')))).ok).toBe(true);
    const bad = body(validateScenarioJson('{"id":"x"}'));
    expect(bad.ok).toBe(false);
    expect((bad.issues as unknown[]).length).toBeGreaterThan(0);
    expect(body(validateScenarioJson('{not json')).ok).toBe(false);
  });

  it('simulate_run scores a perfect run as S', async () => {
    const r = await simulateRun(
      DIR,
      'nginx-502',
      ['cp /etc/app/app.env.bak /etc/app/app.env', 'systemctl restart app', 'report app-env-missing'],
      'ja',
    );
    expect(body(r)).toMatchObject({ phase: 'reported', score: 100, rank: 'S', rootCauseCorrect: true });
    expect(body(r).postmortem as string).toContain('# ポストモーテム');
  });

  it('simulate_run rejects bad ids', async () => {
    expect((await simulateRun(DIR, '../x', [], 'en')).isError).toBe(true);
  });

  it('simulate_run rejects more than the command limit', async () => {
    const r = await simulateRun(DIR, 'nginx-502', Array.from({ length: 101 }, () => 'uptime'), 'en');
    expect(r.isError).toBe(true);
  });
});
