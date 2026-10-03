import { describe, expect, it } from 'vitest';
import { createInitialState, run, step } from '../src/engine/engine.ts';
import { renderPostmortem } from '../src/engine/postmortem.ts';
import { computeScore } from '../src/engine/scoring.ts';
import { loadShippedScenarios } from './helpers.ts';

const shipped = loadShippedScenarios();
const byId = (id: string) => {
  const hit = shipped.find((s) => s.scenario.id === id);
  if (!hit) throw new Error(`scenario ${id} not shipped`);
  return hit.scenario;
};

describe('every shipped scenario', () => {
  it.each(shipped.map((s) => [s.scenario.id, s] as const))(
    '%s: shortest solution + correct report reaches rank S',
    (_id, { scenario, solution }) => {
      const { state } = run(scenario, [...solution, `report ${scenario.correctRootCause}`]);
      expect(state.phase).toBe('reported');
      expect(computeScore(scenario, state)).toMatchObject({ score: 100, rank: 'S', rootCauseCorrect: true });
    },
  );

  it.each(shipped.map((s) => [s.scenario.id, s] as const))('%s: postmortem renders in ja and en', (_id, { scenario, solution }) => {
    const { state } = run(scenario, [...solution, `report ${scenario.correctRootCause}`]);
    expect(renderPostmortem(scenario, state, 'ja')).toContain('## タイムライン');
    expect(renderPostmortem(scenario, state, 'en')).toContain('## Timeline');
  });
});

describe('nginx-502 walkthrough', () => {
  const scenario = byId('nginx-502');

  it('restart before fixing the config fails and does not recover', () => {
    const { state } = run(scenario, ['systemctl restart app']);
    expect(state.phase).toBe('investigating');
    expect(state.flags.app_running).toBe(false);
  });

  it('later rules see updated flags (curl returns 200 after recovery)', () => {
    const { output } = run(scenario, [
      'cp /etc/app/app.env.bak /etc/app/app.env',
      'systemctl restart app',
      'curl -I http://localhost',
    ]);
    expect(output.map((l) => l.text)).toContain('HTTP/1.1 200 OK');
  });

  it('sudo prefix is accepted', () => {
    const { state } = run(scenario, ['sudo cp /etc/app/app.env.bak /etc/app/app.env', 'sudo systemctl restart app']);
    expect(state.phase).toBe('recovered');
  });

  it('report before recovery is refused and not counted', () => {
    const { state, output } = run(scenario, ['report app-env-missing'], 'ja');
    expect(state.phase).toBe('investigating');
    expect(state.commandCount).toBe(0);
    expect(output[0]?.text).toContain('まだサービスが復旧していません');
  });

  it('wrong report costs 30 points', () => {
    const { state } = run(scenario, ['cp /etc/app/app.env.bak /etc/app/app.env', 'systemctl restart app', 'report db-down']);
    expect(computeScore(scenario, state)).toMatchObject({ score: 70, rank: 'B', rootCauseCorrect: false });
  });

  it('global danger patterns are blocked with a 20 point penalty', () => {
    const { state, output } = run(scenario, ['rm -rf /']);
    expect(state.dangerPenalty).toBe(20);
    expect(output[0]?.kind).toBe('warn');
  });

  it('scenario danger rules apply their own penalty', () => {
    const { state } = run(scenario, ['reboot']);
    expect(state.dangerPenalty).toBe(15);
  });

  it('hints cost 5 each and run out', () => {
    let state = createInitialState(scenario);
    for (let i = 0; i < scenario.hints.length + 2; i += 1) state = step(scenario, state, 'hint', 'en').state;
    expect(state.hintsUsed).toBe(scenario.hints.length);
  });

  it('clear and help are free', () => {
    const r1 = step(scenario, createInitialState(scenario), 'clear', 'en');
    expect(r1.clear).toBe(true);
    const r2 = step(scenario, r1.state, 'help', 'en');
    expect(r2.state.commandCount).toBe(0);
  });

  it('postmortem escapes backticks in player input', () => {
    const { state } = run(scenario, ['echo `id`']);
    expect(renderPostmortem(scenario, state, 'en')).toContain('`` echo `id` ``');
  });
});
