import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AdapterPlan } from '../../src/core/contracts/adapter.js';
import { CODEX_CONFIG_FILE, planCodexInstall, planCodexRemove } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { CURSOR_CONFIG_FILE, planCursorInstall } from '../../src/infrastructure/harnesses/cursor/planner.js';
import { ANTIGRAVITY_CONFIG_FILE, planAntigravityInstall } from '../../src/infrastructure/harnesses/antigravity-cli/planner.js';

type Planner = (root: string) => Promise<AdapterPlan>;

const CODEX_EVENTS = ['PostToolUse', 'SessionStart', 'Stop'];
const THIRD_PARTY_GROUP = { matcher: '*', hooks: [{ type: 'command', command: 'echo third-party' }] };
const AGY_USER_CHILD = { 'user-hook': { command: 'echo user' } };
const MIXED_GROUP = '      {\n        "matcher": "*",\n        "hooks": [\n          { "type": "command", "command": "echo user" }';
const MIXED_OWNED = ',\n          { "type": "command", "command": "node .codex/hooks/context-brake.mjs PostToolUse" }';
const MIXED_TAIL = '\n        ]\n      }\n    ]\n  }\n}\n';
let root = '';

function codexGroup(event: string, prefix: readonly object[] = []): object[] {
  const matcher = event === 'SessionStart' ? 'startup|resume|clear|compact' : '*';
  return [...prefix, { matcher, hooks: [{ type: 'command', command: `git -c "alias.contextbrake=!node .codex/hooks/context-brake.mjs" contextbrake ${event}` }] }];
}
function twoFormHooks(): string {
  const hooks = Object.fromEntries(CODEX_EVENTS.map((event) => [event, [THIRD_PARTY_GROUP, { matcher: '*', hooks: [{ type: 'command', command: `node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" ${event}`, commandWindows: `for /f "delims=" %i in ('git rev-parse --show-toplevel') do @node "%i/.codex/hooks/context-brake.mjs" ${event}` }] }]]));
  return JSON.stringify({ hooks }, null, 2);
}
function cursorEntry(event: string): object[] {
  return [{ command: `node .cursor/hooks/context-brake.mjs ${event}` }];
}
function cursorHooks(postToolUse: readonly object[] = []): object {
  return { postToolUse: [...cursorEntry('postToolUse'), ...postToolUse], sessionStart: cursorEntry('sessionStart'), preCompact: cursorEntry('preCompact') };
}
function antigravityRegistration(): object {
  return Object.fromEntries(['PreInvocation', 'PostToolUse'].map((event) => [event, [{ type: 'command', command: `node .agents/hooks/context-brake.mjs ${event}` }]]));
}
function json(value: object): () => Promise<string> {
  return () => Promise.resolve(`${JSON.stringify(value, null, 2)}\n`);
}
async function planned(config: string, planner: Planner): Promise<string> {
  const content = (await planner(root)).changes.find((change) => change.path === config)!.content!;
  await writeFile(join(root, config), content, 'utf8');
  return content;
}

describe('legacy ContextBrake entries migrate to the current registration (CR-01; DEC-04, CR-06)', () => {
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-legacy-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it.for([
    ['the relative Codex command (CR-01)', CODEX_CONFIG_FILE, planCodexInstall, () => readFile('tests/fixtures/harnesses/codex-cli/legacy-hooks.json', 'utf8'), { hooks: Object.fromEntries(CODEX_EVENTS.map((event) => [event, codexGroup(event)])) }],
    ['the two-form Codex command beside a third-party group (DEC-04, CR-06)', CODEX_CONFIG_FILE, planCodexInstall, () => Promise.resolve(twoFormHooks()), { hooks: Object.fromEntries(CODEX_EVENTS.map((event) => [event, codexGroup(event, [THIRD_PARTY_GROUP])])) }],
    ['the ./.cursor Cursor command (CR-01)', CURSOR_CONFIG_FILE, planCursorInstall, () => readFile('tests/fixtures/harnesses/cursor/legacy-hooks.json', 'utf8'), { version: 1, hooks: cursorHooks() }],
    ['a Cursor file without the version field', CURSOR_CONFIG_FILE, planCursorInstall, json({ hooks: {} }), { hooks: cursorHooks(), version: 1 }],
    ['an Antigravity legacy event that also holds a user child (CR-02)', ANTIGRAVITY_CONFIG_FILE, planAntigravityInstall, json({ hooks: { PreToolUse: { 'context-brake': { command: 'node .agents/hooks/context-brake.mjs PreToolUse' }, ...AGY_USER_CHILD } } }), { hooks: { PreToolUse: AGY_USER_CHILD }, 'context-brake': antigravityRegistration() }],
  ] as const)('migrates %s to the current registration and changes nothing on a second install', async ([, config, planner, legacy, expected]) => {
    await mkdir(dirname(join(root, config)), { recursive: true });
    await writeFile(join(root, config), await legacy(), 'utf8');
    const first = await planned(config, planner);
    expect(JSON.parse(first)).toEqual(expected);
    expect(await planned(config, planner)).toBe(first);
  });
});

describe('current registrations beside user hooks (CA-05, CR-01)', () => {
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-current-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it.for([
    ['Codex', CODEX_CONFIG_FILE, planCodexInstall, { hooks: { PostToolUse: [...codexGroup('PostToolUse'), THIRD_PARTY_GROUP], SessionStart: codexGroup('SessionStart'), Stop: codexGroup('Stop') } }],
    ['Cursor', CURSOR_CONFIG_FILE, planCursorInstall, { version: 1, hooks: cursorHooks([{ command: 'echo user' }]) }],
  ] as const)('leaves a current %s registration followed by a user hook unchanged (CA-05)', async ([, config, planner, current]) => {
    await mkdir(dirname(join(root, config)), { recursive: true });
    await writeFile(join(root, config), await json(current)(), 'utf8');
    expect(await planned(config, planner)).toBe(await json(current)());
  });

  it('keeps the user handler of a mixed Codex group on install and remove (CR-01)', async () => {
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, CODEX_CONFIG_FILE), `{\n  "hooks": {\n    "PostToolUse": [\n${MIXED_GROUP}${MIXED_OWNED}${MIXED_TAIL}`, 'utf8');
    const installed = JSON.parse(await planned(CODEX_CONFIG_FILE, planCodexInstall)) as { hooks: Record<string, unknown> };
    expect(installed.hooks.PostToolUse).toEqual(codexGroup('PostToolUse', [{ matcher: '*', hooks: [{ type: 'command', command: 'echo user' }] }]));
    expect(await planned(CODEX_CONFIG_FILE, planCodexRemove)).toBe(`{\n  "hooks": {\n    "PostToolUse": [\n${MIXED_GROUP}${MIXED_TAIL}`);
  });
});
