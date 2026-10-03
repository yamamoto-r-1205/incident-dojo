/**
 * Validate every power under powers/ (plugin.json, mcp.json, SKILL.md frontmatter).
 * Exit code 0 = valid, 1 = at least one issue.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePowerDir } from '../src/node/powerValidator.ts';

const POWERS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../powers');

// ---- Main ----

async function main(): Promise<number> {
  const entries = await readdir(POWERS_DIR, { withFileTypes: true });
  const powers = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (powers.length === 0) {
    console.error('✖ no powers found under powers/');
    return 1;
  }
  let failed = 0;
  for (const name of powers) {
    const issues = await validatePowerDir(path.join(POWERS_DIR, name));
    if (issues.length === 0) {
      console.log(`✔ powers/${name}`);
      continue;
    }
    failed += 1;
    console.error(`✖ powers/${name}`);
    for (const i of issues) console.error(`    ${i.file}: ${i.message}`);
  }
  return failed === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error('validate-power crashed:', err);
    process.exit(1);
  },
);
