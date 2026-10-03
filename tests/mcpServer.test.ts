import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

// End-to-end over the real stdio transport, the same way Kiro launches the server.
describe('incident-dojo MCP server (stdio)', () => {
  const client = new Client({ name: 'test-client', version: '0.0.0' });

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(ROOT, 'node_modules/tsx/dist/cli.mjs'), 'mcp-server/src/index.ts'],
      cwd: ROOT,
      stderr: 'ignore',
    });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it('exposes exactly the four read-only tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['get_scenario', 'list_scenarios', 'simulate_run', 'validate_scenario']);
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
  });

  it('simulate_run works over the wire', async () => {
    const r = await client.callTool({
      name: 'simulate_run',
      arguments: { id: 'nginx-502', commands: ['cp /etc/app/app.env.bak /etc/app/app.env', 'systemctl restart app', 'report app-env-missing'] },
    });
    const text = (r.content as { text: string }[])[0]!.text;
    expect(JSON.parse(text)).toMatchObject({ rank: 'S', score: 100 });
  });

  it('schema validation rejects traversal ids before the handler runs', async () => {
    const r = await client.callTool({ name: 'get_scenario', arguments: { id: '../../etc/passwd' } });
    expect(r.isError).toBe(true);
  });
});
