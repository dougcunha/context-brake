import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AntigravityAdapter } from '../../src/infrastructure/harnesses/antigravity-cli/adapter.js';
import { ANTIGRAVITY_CONFIG_FILE, planAntigravityInstall } from '../../src/infrastructure/harnesses/antigravity-cli/planner.js';

const REGISTRATION = {
  PreInvocation: [{ type: 'command', command: 'node .agents/hooks/context-brake.mjs PreInvocation' }],
  PostToolUse: [{ type: 'command', command: 'node .agents/hooks/context-brake.mjs PostToolUse' }],
};

async function plannedConfig(root: string): Promise<string> {
  const content = (await planAntigravityInstall(root)).changes.find((c) => c.path === ANTIGRAVITY_CONFIG_FILE)!.content!;
  await writeFile(join(root, ANTIGRAVITY_CONFIG_FILE), content, 'utf8');
  return content;
}

describe('Antigravity legacy migration (CR-02)', () => {
  let root: string;
  const adapter = new AntigravityAdapter();
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-agy-reg-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('migrates legacy entries, changes nothing on a second install, and diagnoses missing or present states', async () => {
    await mkdir(join(root, '.agents/hooks'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/antigravity-cli/legacy-hooks.json', join(root, ANTIGRAVITY_CONFIG_FILE));
    const findingsBefore = await adapter.diagnose({ projectRoot: root });
    expect(findingsBefore.some((f) => f.code === 'INTEGRATION_MISSING')).toBe(true);
    const migrated = await plannedConfig(root);
    expect(JSON.parse(migrated)).toEqual({ 'context-brake': REGISTRATION });
    expect(await plannedConfig(root)).toBe(migrated);
    await writeFile(join(root, '.agents/hooks/context-brake.mjs'), '', 'utf8');
    const findingsAfter = await adapter.diagnose({ projectRoot: root });
    expect(findingsAfter.filter((f) => f.code === 'INTEGRATION_MISSING')).toHaveLength(0);
  });
});
