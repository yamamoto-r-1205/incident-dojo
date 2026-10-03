import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/** One problem found in a power directory. */
export interface PowerIssue {
  readonly file: string;
  readonly message: string;
}

// ---- Constants ----

export const PLUGIN_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
export const MCP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

// ---- Manifest checks (pure) ----

/**
 * Check plugin.json against the Agent Plugins required fields.
 * @param manifest - parsed plugin.json
 * @returns issues (empty when valid)
 */
export function checkPluginManifest(manifest: unknown): string[] {
  if (!isObject(manifest)) return ['plugin.json must be a JSON object'];
  const issues: string[] = [];
  if (manifest.$schema !== PLUGIN_SCHEMA) issues.push(`$schema must be ${PLUGIN_SCHEMA}`);
  if (typeof manifest.name !== 'string' || !KEBAB.test(manifest.name)) issues.push('name must be kebab-case');
  if (typeof manifest.version !== 'string' || !SEMVER.test(manifest.version)) issues.push('version must be semver (x.y.z)');
  if (typeof manifest.description !== 'string' || manifest.description.trim() === '') issues.push('description is required');
  if (!isObject(manifest.author) || typeof manifest.author.name !== 'string' || manifest.author.name.trim() === '') {
    issues.push('author.name is required');
  }
  const keywords = manifest.keywords;
  if (!Array.isArray(keywords) || keywords.length === 0 || !keywords.every((k) => typeof k === 'string' && k.trim() !== '')) {
    issues.push('keywords must be a non-empty array of strings');
  }
  return issues;
}

/**
 * Check the power's mcp.json.
 * @param config - parsed mcp.json
 * @returns issues (empty when valid)
 */
export function checkMcpConfig(config: unknown): string[] {
  if (!isObject(config)) return ['mcp.json must be a JSON object'];
  const issues: string[] = [];
  if (config.$schema !== MCP_SCHEMA) issues.push(`$schema must be ${MCP_SCHEMA}`);
  if (!isObject(config.mcpServers) || Object.keys(config.mcpServers).length === 0) {
    return [...issues, 'mcpServers must define at least one server'];
  }
  for (const [name, server] of Object.entries(config.mcpServers)) {
    if (!isObject(server)) issues.push(`mcpServers.${name} must be an object`);
    else if (typeof server.command !== 'string' && typeof server.url !== 'string') {
      issues.push(`mcpServers.${name} needs a command or url`);
    }
  }
  return issues;
}

/**
 * Check SKILL.md frontmatter for `name` and `description`.
 * @param markdown - SKILL.md content
 * @param dirName - skill directory name (must equal frontmatter name)
 * @returns issues (empty when valid)
 */
export function checkSkillFrontmatter(markdown: string, dirName: string): string[] {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  if (!match) return ['missing YAML frontmatter'];
  const fields = new Map(
    (match[1] ?? '')
      .split(/\r?\n/)
      .map((line) => /^([a-zA-Z_-]+):\s*(.*)$/.exec(line))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );
  const issues: string[] = [];
  if (!fields.get('name')) issues.push('frontmatter name is required');
  else if (fields.get('name') !== dirName) issues.push(`frontmatter name "${fields.get('name')}" must equal the directory "${dirName}"`);
  if (!fields.get('description')) issues.push('frontmatter description is required');
  return issues;
}

// ---- Directory check (I/O) ----

/**
 * Validate a power directory: plugin.json, optional mcp.json and skills/<name>/SKILL.md.
 * @param dir - power root
 * @returns all issues found; JSON / IO errors are reported as issues
 */
export async function validatePowerDir(dir: string): Promise<PowerIssue[]> {
  const issues: PowerIssue[] = [];
  const add = (file: string, messages: string[]): void => messages.forEach((message) => issues.push({ file, message }));

  add('plugin.json', await withJson(path.join(dir, 'plugin.json'), checkPluginManifest, true));
  add('mcp.json', await withJson(path.join(dir, 'mcp.json'), checkMcpConfig, false));

  const skillsDir = path.join(dir, 'skills');
  const skills = await readdir(skillsDir, { withFileTypes: true }).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') return [];
    throw err;
  });
  for (const entry of skills.filter((e) => e.isDirectory())) {
    const file = path.join('skills', entry.name, 'SKILL.md');
    try {
      add(file, checkSkillFrontmatter(await readFile(path.join(dir, file), 'utf8'), entry.name));
    } catch (err) {
      add(file, [`cannot read: ${(err as Error).message}`]);
    }
  }
  return issues;
}

async function withJson(file: string, check: (json: unknown) => string[], required: boolean): Promise<string[]> {
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT' && !required) return [];
    return [`cannot read: ${(err as Error).message}`];
  }
  try {
    return check(JSON.parse(raw));
  } catch (err) {
    return [`invalid JSON: ${(err as Error).message}`];
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
