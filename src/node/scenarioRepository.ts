import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ID_PATTERN } from '../engine/schema.ts';
import { type ValidationResult, validateScenario } from '../engine/validate.ts';

/** Absolute path of the repository's `scenarios/` directory. */
export const DEFAULT_SCENARIO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scenarios');

/** Validation result for one scenario file. */
export interface FileValidation {
  readonly file: string;
  readonly id: string;
  readonly result: ValidationResult;
}

/**
 * List scenario ids (file names without `.json`) in a directory.
 * @param dir - scenarios directory
 * @returns sorted ids
 */
export async function listScenarioIds(dir: string = DEFAULT_SCENARIO_DIR): Promise<string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

/**
 * Read and validate one scenario by id. The id is checked against ID_PATTERN
 * before touching the file system, which prevents path traversal.
 * @param id - scenario id
 * @param dir - scenarios directory
 * @returns validation result for the file
 * @throws Error when the id is malformed or the file cannot be read / parsed as JSON
 */
export async function loadScenarioFile(id: string, dir: string = DEFAULT_SCENARIO_DIR): Promise<FileValidation> {
  if (!ID_PATTERN.test(id)) throw new Error(`Invalid scenario id: ${JSON.stringify(id)}`);
  const file = path.join(dir, `${id}.json`);
  const raw = await readFile(file, 'utf8');
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${file}: invalid JSON (${(err as Error).message})`, { cause: err });
  }
  return { file, id, result: validateScenario(json, id) };
}

/**
 * Validate every scenario file in a directory.
 * @param dir - scenarios directory
 * @returns one entry per file; JSON / IO errors are reported as issues instead of thrown
 */
export async function validateAll(dir: string = DEFAULT_SCENARIO_DIR): Promise<FileValidation[]> {
  const ids = await listScenarioIds(dir);
  return Promise.all(
    ids.map(async (id) => {
      try {
        return await loadScenarioFile(id, dir);
      } catch (err) {
        const message = (err as Error).message;
        return { file: path.join(dir, `${id}.json`), id, result: { ok: false, issues: [{ path: '(file)', message }] } };
      }
    }),
  );
}
