import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(import.meta.dirname, '../scripts/danger-guard.mjs');

function runGuard(stdin: string): { status: number | null; stderr: string } {
  const r = spawnSync(process.execPath, [SCRIPT], { input: stdin, encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr };
}

const event = (command: string) =>
  JSON.stringify({ hook_event_name: 'preToolUse', tool_name: 'execute_bash', tool_input: { command } });

describe('scripts/danger-guard.mjs (PreToolUse hook)', () => {
  it.each([
    'rm -rf node_modules',
    'cd /tmp && rm -fr build',
    'rm -r -f dist',
    'git push --force origin main',
    'git push -f',
    'git reset --hard HEAD~1',
    'git clean -fd',
    'sudo apt-get install foo',
  ])('blocks %s with exit 2', (command) => {
    const r = runGuard(event(command));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('danger-guard blocked');
  });

  it.each(['npm test -- --run', 'git push -u origin feat/x', 'rm dist/index.html', 'git status', 'echo "-rf is a flag"'])(
    'allows %s',
    (command) => {
      expect(runGuard(event(command)).status).toBe(0);
    },
  );

  it('does not block on malformed input (warning exit 1)', () => {
    expect(runGuard('not json').status).toBe(1);
  });
});
