/**
 * Validate every scenarios/*.json file (schema + semantic + reachability).
 * Used by the `validate-scenario` Kiro hook, `npm run check` and CI.
 * Exit code 0 = all valid, 1 = at least one invalid file.
 */
import path from 'node:path';
import { DEFAULT_SCENARIO_DIR, validateAll } from '../src/node/scenarioRepository.ts';

// ---- Main ----

async function main(): Promise<number> {
  const dir = process.env.INCIDENT_DOJO_SCENARIOS ?? DEFAULT_SCENARIO_DIR;
  const results = await validateAll(dir);
  let failed = 0;

  for (const { file, result } of results) {
    const name = path.relative(process.cwd(), file);
    if (result.ok) {
      console.log(`✔ ${name}  (shortest fix: ${result.solution.length} cmd, par ${result.scenario.par})`);
      continue;
    }
    failed += 1;
    console.error(`✖ ${name}`);
    for (const issue of result.issues) console.error(`    ${issue.path}: ${issue.message}`);
  }

  console.log(`\n${results.length - failed}/${results.length} scenarios valid`);
  return failed === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error('validate-scenarios crashed:', err);
    process.exit(1);
  },
);
