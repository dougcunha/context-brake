import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

type Scenario = { name: string; harness: string; file: string; retired: readonly string[]; build: (owned: boolean) => unknown };

const CODEX_HOOK = '.codex/hooks/context-brake.mjs';
const CURSOR_HOOK = '.cursor/hooks/context-brake.mjs';
const ANTIGRAVITY_HOOK = '.agents/hooks/context-brake.mjs';

function codexAlias(event: string) {
  return { type: 'command', command: `git -c "alias.contextbrake=!node ${CODEX_HOOK}" contextbrake ${event}` };
}

function codexLegacy(event: string) {
  return { type: 'command', command: `node "$(git rev-parse --show-toplevel)/${CODEX_HOOK}" ${event}`, commandWindows: `node "%i/${CODEX_HOOK}" ${event}` };
}

function codexGroups(owned: boolean) {
  return {
    PreToolUse: [
      { matcher: '*', hooks: [...(owned ? [codexAlias('PreToolUse')] : []), { type: 'command', command: 'echo keep-same' }] },
      ...(owned ? [{ matcher: '*', hooks: [codexLegacy('PreToolUse')] }] : []),
    ],
    ...(owned ? { PostCompact: [{ matcher: '*', hooks: [codexAlias('PostCompact')] }] } : {}),
    UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'echo keep-event' }] }],
  };
}

function cursorEntries(owned: boolean) {
  return {
    preToolUse: [...(owned ? [{ command: `node ${CURSOR_HOOK} preToolUse` }] : []), { command: 'echo keep-same' }],
    ...(owned ? { stop: [{ command: `node ${CURSOR_HOOK} stop` }] } : {}),
    beforeShellExecution: [{ command: 'echo keep-event' }],
  };
}

function antigravityHandlers(event: string) {
  return [{ type: 'command', command: `node ${ANTIGRAVITY_HOOK} ${event}` }];
}

function antigravityEvents(owned: boolean) {
  return {
    PreToolUse: { ...(owned ? { 'context-brake': antigravityHandlers('PreToolUse') } : {}), other: [{ type: 'command', command: 'echo keep-same' }] },
    ...(owned ? { Stop: { 'context-brake': antigravityHandlers('Stop') } } : {}),
  };
}

const SCENARIOS: readonly Scenario[] = [
  { name: 'Codex CLI', harness: 'codex-cli', file: '.codex/hooks.json', retired: ['PreToolUse', 'PostCompact'], build: (owned) => ({ hooks: codexGroups(owned) }) },
  { name: 'Cursor', harness: 'cursor', file: '.cursor/hooks.json', retired: ['preToolUse', 'stop'], build: (owned) => ({ version: 1, hooks: cursorEntries(owned) }) },
  { name: 'Antigravity CLI', harness: 'antigravity-cli', file: '.agents/hooks.json', retired: ['PreToolUse', 'Stop'], build: (owned) => ({ theme: 'keep-key', hooks: antigravityEvents(owned) }) },
];

function render(scenario: Scenario, owned: boolean): string {
  return `${JSON.stringify(scenario.build(owned), null, 2)}\n`;
}
async function seed(scenario: Scenario): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-t04-'));
  await mkdir(dirname(join(root, scenario.file)), { recursive: true });
  await writeFile(join(root, scenario.file), render(scenario, true), 'utf8');
  return root;
}

function retiredText(scenario: Scenario, text: string): string {
  const hooks = (JSON.parse(text) as { hooks?: Record<string, unknown> }).hooks ?? {};
  return JSON.stringify(scenario.retired.map((event) => hooks[event] ?? null));
}

async function plannedHarnessFileChanges(scenario: Scenario, root: string): Promise<unknown[]> {
  const result = await runInProcessCli(['init', '--dry-run', '--json', '--harness', scenario.harness], root);
  return installReportSchema.parse(JSON.parse(result.stdout)).plan.changes.filter((change) => change.path === scenario.file);
}

describe.each(SCENARIOS)('FR-03 and FR-04 retired events for $name (prd-15, TC-07, TC-08)', (scenario) => {
  let root: string;
  beforeEach(async () => { root = await seed(scenario); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('init removes the owned retired entries, a second init plans nothing, and remove restores the foreign content byte for byte (FR-03, FR-04, NFR-01, TC-07)', async () => {
    expect((await runInProcessCli(['init', '--yes', '--harness', scenario.harness], root)).code).toBeLessThanOrEqual(1);
    expect(retiredText(scenario, await readFile(join(root, scenario.file), 'utf8'))).not.toContain('context-brake.mjs');
    expect(await plannedHarnessFileChanges(scenario, root)).toEqual([]);
    expect((await runInProcessCli(['remove', '--yes'], root)).code).toBe(0);
    expect(await readFile(join(root, scenario.file), 'utf8')).toBe(render(scenario, false));
  });
});
