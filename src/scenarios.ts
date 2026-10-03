import type { Scenario } from './engine/schema.ts';
import { validateScenario } from './engine/validate.ts';

/** Scenarios bundled into the static site, validated at startup. */
export interface ScenarioCatalog {
  readonly scenarios: readonly Scenario[];
  /** Files that failed validation (shown to the player instead of crashing the app). */
  readonly errors: readonly { file: string; message: string }[];
}

const SEVERITY_ORDER = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;

/**
 * Load every scenarios/*.json file bundled by Vite and validate it with the engine.
 * @returns valid scenarios (sorted by category, then severity) and per-file errors
 */
export function loadCatalog(): ScenarioCatalog {
  const modules = import.meta.glob<unknown>('../scenarios/*.json', { eager: true, import: 'default' });
  const scenarios: Scenario[] = [];
  const errors: { file: string; message: string }[] = [];

  for (const [file, json] of Object.entries(modules)) {
    const id = file.split('/').pop()?.replace(/\.json$/, '');
    const result = validateScenario(json, id);
    if (result.ok) scenarios.push(result.scenario);
    else errors.push({ file, message: result.issues.map((i) => `${i.path}: ${i.message}`).join('; ') });
  }

  scenarios.sort(
    (a, b) => a.category.localeCompare(b.category) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id),
  );
  return { scenarios, errors };
}
