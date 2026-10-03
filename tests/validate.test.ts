import { describe, expect, it } from 'vitest';
import { validateScenario } from '../src/engine/validate.ts';
import { rawScenario } from './helpers.ts';

type Json = Record<string, unknown>;
const base = (): Json => rawScenario('nginx-502');
const commands = (s: Json) => s.commands as Json[];
const paths = (json: Json) => {
  const r = validateScenario(json);
  return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
};

describe('validateScenario', () => {
  it('accepts the reference scenario and returns the shortest solution', () => {
    const r = validateScenario(base(), 'nginx-502');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.solution).toEqual(['cp /etc/app/app.env.bak /etc/app/app.env', 'systemctl restart app']);
  });

  it('rejects a missing en text', () => {
    const s = base();
    s.title = { ja: 'タイトル' };
    expect(paths(s).join()).toMatch(/title\.en/);
  });

  it('rejects an id that does not match the file name', () => {
    expect(validateScenario(base(), 'other').ok).toBe(false);
  });

  it('rejects ids with path characters', () => {
    const s = base();
    s.id = '../etc/passwd';
    expect(paths(s).join()).toMatch(/^id:/);
  });

  it('rejects non-normalized match strings', () => {
    const s = base();
    commands(s)[0]!.match = ['curl   -I'];
    expect(paths(s).join()).toMatch(/whitespace-normalized/);
  });

  it('rejects an unknown correctRootCause', () => {
    const s = base();
    s.correctRootCause = 'nope';
    expect(paths(s).join()).toMatch(/correctRootCause/);
  });

  it('rejects duplicate rule ids', () => {
    const s = base();
    commands(s)[1]!.id = commands(s)[0]!.id;
    expect(paths(s).join()).toMatch(/duplicate rule id/);
  });

  it('rejects undeclared flags (typo guard)', () => {
    const s = base();
    commands(s)[0]!.when = { app_runing: true };
    expect(paths(s).join()).toMatch(/app_runing/);
  });

  it('rejects rules that shadow builtins', () => {
    const s = base();
    commands(s)[0]!.match = ['help me'];
    expect(paths(s).join()).toMatch(/shadows the builtin/);
  });

  it('rejects unreachable recovery', () => {
    const s = base();
    s.commands = commands(s).filter((r) => r.id !== 'restore-env');
    expect(paths(s).join()).toMatch(/unreachable/);
  });

  it('rejects recovery that is only reachable through danger rules', () => {
    const s = base();
    const restore = commands(s).find((r) => r.id === 'restore-env')!;
    restore.danger = { penalty: 10, message: { ja: '危険', en: 'danger' } };
    expect(paths(s).join()).toMatch(/unreachable/);
  });

  it('rejects par lower than the shortest path', () => {
    const s = base();
    s.par = 1;
    expect(paths(s).join()).toMatch(/par is 1/);
  });

  it('rejects unknown keys (strict schema)', () => {
    const s = base();
    s.extra = true;
    expect(validateScenario(s).ok).toBe(false);
  });
});
