import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkMcpConfig,
  checkPluginManifest,
  checkSkillFrontmatter,
  MCP_SCHEMA,
  PLUGIN_SCHEMA,
  validatePowerDir,
} from '../src/node/powerValidator.ts';

const POWER = path.resolve(import.meta.dirname, '../powers/incident-dojo');
const good = () => ({
  $schema: PLUGIN_SCHEMA,
  name: 'incident-dojo',
  version: '1.0.0',
  description: 'x',
  author: { name: 'someone' },
  keywords: ['incident'],
});

describe('power validator', () => {
  it('the shipped power is valid', async () => {
    expect(await validatePowerDir(POWER)).toEqual([]);
  });

  it('accepts a minimal manifest', () => {
    expect(checkPluginManifest(good())).toEqual([]);
  });

  it.each([
    ['name', { name: 'Incident Dojo' }, /kebab-case/],
    ['version', { version: '1.0' }, /semver/],
    ['author', { author: {} }, /author\.name/],
    ['keywords', { keywords: [] }, /keywords/],
    ['$schema', { $schema: 'x' }, /\$schema/],
  ])('rejects a bad %s', (_f, patch, re) => {
    expect(checkPluginManifest({ ...good(), ...patch }).join()).toMatch(re);
  });

  it('mcp.json needs servers with a command or url', () => {
    expect(checkMcpConfig({ $schema: MCP_SCHEMA, mcpServers: { a: { command: 'npx' } } })).toEqual([]);
    expect(checkMcpConfig({ $schema: MCP_SCHEMA, mcpServers: {} }).join()).toMatch(/at least one/);
    expect(checkMcpConfig({ $schema: MCP_SCHEMA, mcpServers: { a: {} } }).join()).toMatch(/command or url/);
  });

  it('SKILL.md needs frontmatter name matching the directory and a description', () => {
    expect(checkSkillFrontmatter('---\nname: s\ndescription: d\n---\n# x', 's')).toEqual([]);
    expect(checkSkillFrontmatter('# no frontmatter', 's').join()).toMatch(/missing/);
    expect(checkSkillFrontmatter('---\nname: other\ndescription: d\n---\n', 's').join()).toMatch(/must equal/);
    expect(checkSkillFrontmatter('---\nname: s\n---\n', 's').join()).toMatch(/description/);
  });
});
