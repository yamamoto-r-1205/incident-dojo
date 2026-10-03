#!/usr/bin/env node
/**
 * Incident Dojo MCP server (stdio). Read-only tools for Kiro agents:
 * list / get / validate / simulate scenarios. There is intentionally no write tool;
 * agents write files with their own (permission-scoped) write tool so hooks still fire.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { DEFAULT_SCENARIO_DIR } from '../../src/node/scenarioRepository.ts';
import { getScenario, LIMITS, listScenarios, simulateRun, validateScenarioJson } from './tools.ts';

// ---- Configuration ----

// `||` rather than `??`: launchers may pass an empty string for an unset variable.
const SCENARIO_DIR = process.env.INCIDENT_DOJO_SCENARIOS || DEFAULT_SCENARIO_DIR;
const idParam = z.string().regex(/^[a-z0-9-]+$/).describe('Scenario id, e.g. "nginx-502"');
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

const server = new McpServer({ name: 'incident-dojo', version: '0.1.0' });

// ---- Tools ----

server.registerTool(
  'list_scenarios',
  {
    title: 'List scenarios',
    description: 'List every Incident Dojo scenario with title, severity, category, par and validity.',
    annotations: readOnly,
  },
  async () => listScenarios(SCENARIO_DIR),
);

server.registerTool(
  'get_scenario',
  {
    title: 'Get scenario',
    description: 'Return one parsed scenario (defaults applied) and its shortest non-danger recovery path.',
    inputSchema: { id: idParam },
    annotations: readOnly,
  },
  async ({ id }) => getScenario(SCENARIO_DIR, id),
);

server.registerTool(
  'validate_scenario',
  {
    title: 'Validate scenario JSON',
    description:
      'Validate scenario JSON text (schema, unique ids, declared flags, builtin shadowing, root cause, BFS reachability, par). Nothing is written.',
    inputSchema: { json: z.string().max(LIMITS.maxJsonChars).describe('Full scenario JSON document as a string') },
    annotations: readOnly,
  },
  async ({ json }) => validateScenarioJson(json),
);

server.registerTool(
  'simulate_run',
  {
    title: 'Simulate a run',
    description:
      'Replay commands against a scenario with the real game engine. Returns phase, score, rank, penalties, transcript and the generated postmortem. Use it to check difficulty and that the intended solution reaches rank S.',
    inputSchema: {
      id: idParam,
      commands: z.array(z.string().max(500)).max(LIMITS.maxCommands).describe('Inputs in order, e.g. ["systemctl status app", "report app-env-missing"]'),
      locale: z.enum(['ja', 'en']).default('en'),
    },
    annotations: readOnly,
  },
  async ({ id, commands, locale }) => simulateRun(SCENARIO_DIR, id, commands, locale),
);

// ---- Start ----

await server.connect(new StdioServerTransport());
// stdout is reserved for the protocol; log to stderr only.
console.error(`incident-dojo MCP server ready (scenarios: ${SCENARIO_DIR})`);
