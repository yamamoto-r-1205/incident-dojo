#!/usr/bin/env node
/**
 * Kiro PreToolUse hook: block destructive shell commands issued by the agent.
 *
 * Reads the hook event JSON from stdin, collects every string inside `tool_input`
 * and checks it against a small deny list. Mirrors the in-game rule
 * "dangerous operations are blocked and penalized".
 *
 * Exit codes (Kiro hook contract):
 *   0 = allow, 2 = block (stderr is returned to the agent), 1 = hook error (warning only)
 */

// ---- Deny list ----

/** @type {ReadonlyArray<{ id: string, pattern: RegExp, reason: string }>} */
const RULES = [
  {
    id: 'rm-rf',
    pattern: /(^|[\s;&|(])rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r\s+-f|-f\s+-r|--recursive\s+--force|--force\s+--recursive)\b/,
    reason: 'recursive forced delete (rm -rf). Delete specific files instead, or ask the user.',
  },
  {
    id: 'git-push-force',
    pattern: /\bgit\s+push\b[^\n;&|]*\s(--force|-f)(\s|$)/,
    reason: 'force push rewrites shared history. Push a new branch instead.',
  },
  {
    id: 'git-reset-hard',
    pattern: /\bgit\s+reset\s+[^\n;&|]*--hard\b/,
    reason: 'git reset --hard discards uncommitted work.',
  },
  {
    id: 'git-clean-force',
    pattern: /\bgit\s+clean\s+-[a-zA-Z]*f/,
    reason: 'git clean -f deletes untracked files permanently.',
  },
  {
    id: 'sudo',
    pattern: /(^|[\s;&|(])sudo\s/,
    reason: 'privilege escalation is never needed for this project.',
  },
];

// ---- Logic ----

/**
 * Collect every string value nested inside a value.
 * @param {unknown} value
 * @returns {string[]}
 */
function collectStrings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
  return [];
}

/**
 * Find the first deny rule matching any command string.
 * @param {string[]} commands
 * @returns {{ id: string, reason: string, command: string } | null}
 */
function findViolation(commands) {
  for (const command of commands) {
    const rule = RULES.find((r) => r.pattern.test(command));
    if (rule) return { id: rule.id, reason: rule.reason, command };
  }
  return null;
}

/**
 * Read all of stdin as UTF-8.
 * @returns {Promise<string>}
 */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// ---- Main ----

async function main() {
  const raw = await readStdin();
  let event;
  try {
    event = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`danger-guard: could not parse hook event JSON (${err.message}); allowing.\n`);
    return 1;
  }
  const violation = findViolation(collectStrings(event?.tool_input ?? {}));
  if (!violation) return 0;
  process.stderr.write(
    `⛔ danger-guard blocked this command [${violation.id}]: ${violation.reason}\n` +
      `   command: ${violation.command.slice(0, 200)}\n` +
      '   Do not retry with a workaround. Ask the user if this is really required.\n',
  );
  return 2;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`danger-guard crashed: ${err?.stack ?? err}\n`);
    process.exit(1);
  },
);
