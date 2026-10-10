import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AdapterPlan } from '../../src/core/contracts/adapter.js';
import { planAntigravityInstall, planAntigravityRemove } from '../../src/infrastructure/harnesses/antigravity-cli/planner.js';
import { planClaudeInstall, planClaudeRemove } from '../../src/infrastructure/harnesses/claude-code/planner.js';
import { planCodexInstall, planCodexRemove } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { planCursorInstall, planCursorRemove } from '../../src/infrastructure/harnesses/cursor/planner.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

type Planner = (root: string) => Promise<AdapterPlan>;
type Family = { readonly config: string; readonly install: Planner; readonly remove: Planner };

const FIXTURES = 'tests/fixtures/harnesses';
const OWNED_HOOK = /context-brake\.mjs/g;
const USER_FILES = [['.codex/hooks.json', 'codex-cli/user-hooks-trailing.json', 3], ['.cursor/hooks.json', 'cursor/user-hooks-trailing.json', 3], ['.claude/settings.json', 'claude-code/user-settings.json', 3], ['.agents/hooks.json', 'antigravity-cli/user-hooks.json', 2]] as const;
const CLAUDE: Family = { config: '.claude/settings.json', install: (root) => planClaudeInstall({ projectRoot: root }), remove: planClaudeRemove };
const CODEX: Family = { config: '.codex/hooks.json', install: planCodexInstall, remove: planCodexRemove };
const CURSOR: Family = { config: '.cursor/hooks.json', install: planCursorInstall, remove: planCursorRemove };
const ANTIGRAVITY: Family = { config: '.agents/hooks.json', install: planAntigravityInstall, remove: planAntigravityRemove };
const PLANNED_CASES = [
  ['Cursor hooks with CRLF line endings (CR-01)', CURSOR, 'cursor/user-hooks.json', '\r\n'],
  ['minified Claude Code settings (CR-01, RF6)', CLAUDE, 'claude-code/minified-settings.json', ''],
  ['minified Codex hooks (CR-01, RF6)', CODEX, 'codex-cli/minified-hooks.json', ''],
  ['minified Cursor hooks (CR-01, RF6)', CURSOR, 'cursor/minified-hooks.json', ''],
  ['minified Antigravity hooks (CR-01, RF6)', ANTIGRAVITY, 'antigravity-cli/minified-hooks.json', ''],
] as const;
let root = '';

async function readUserFiles(): Promise<string[]> {
  return Promise.all(USER_FILES.map(([config]) => readFile(join(root, config), 'utf8')));
}
async function runCli(args: readonly string[]): Promise<string> {
  const result = await runInProcessCli(args, root);
  expect(result.code).toBe(0);
  return result.stdout;
}
async function applyPlan(family: Family, planner: Planner): Promise<string> {
  const plan = await planner(root);
  expect(plan.conflicts).toEqual([]);
  await writeFile(join(root, family.config), plan.changes.find((item) => item.path === family.config)!.content!, 'utf8');
  return readFile(join(root, family.config), 'utf8');
}

describe('harness config files keep the user bytes (RF6, CA-05, RF19, CA-12)', () => {
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-user-hooks-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('keeps trailing comments and user hooks of every harness through two inits, a healthy doctor, and remove (T29.3, IT-01, CA-01, CR-02)', async () => {
    for (const [config, fixture] of USER_FILES) {
      await mkdir(dirname(join(root, config)), { recursive: true });
      await copyFile(join(FIXTURES, fixture), join(root, config));
    }
    const initial = await readUserFiles();
    await runCli(['init', '--yes']);
    const first = await readUserFiles();
    expect(first.map((text) => text.match(OWNED_HOOK)?.length)).toEqual(USER_FILES.map(([, , events]) => events));
    await runCli(['init', '--yes']);
    expect(await readUserFiles()).toEqual(first);
    expect(await runInProcessCli(['doctor', '--json'], root).then((doctor) => doctor.stdout)).not.toContain('INTEGRATION_MISSING');
    await runCli(['remove', '--yes']);
    expect(await readUserFiles()).toEqual(initial);
  });

  it.for(PLANNED_CASES)('keeps %s byte for byte through install, a second install, and remove', async ([, family, fixture, lineEnding]) => {
    const initial = (await readFile(join(FIXTURES, fixture), 'utf8')).replaceAll('\n', lineEnding || '\n');
    await mkdir(dirname(join(root, family.config)), { recursive: true });
    await writeFile(join(root, family.config), initial, 'utf8');
    const first = await applyPlan(family, family.install);
    expect(first).not.toBe(initial);
    expect(first.replaceAll(lineEnding, '')).not.toMatch(/[\r\n]/);
    expect(await applyPlan(family, family.install)).toBe(first);
    expect(await applyPlan(family, family.remove)).toBe(initial);
  });
});
