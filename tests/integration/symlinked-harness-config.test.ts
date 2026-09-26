import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { CursorAdapter } from '../../src/infrastructure/harnesses/cursor/adapter.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';
import { attemptLink, type LinkAttempt, requireLink } from '../helpers/link-capability.js';

async function setupClaudeRepo(dir: string): Promise<LinkAttempt> {
  const realAgents = join(dir, '.agents');
  await mkdir(realAgents, { recursive: true });
  const userJson = JSON.stringify({ hooks: { UserHook: 'node custom.js' } }, null, 2);
  await writeFile(join(realAgents, 'settings.json'), `${userJson}\n`, 'utf8');
  return attemptLink(realAgents, join(dir, '.claude'));
}

async function setupCursorRepo(dir: string): Promise<LinkAttempt> {
  const realCursor = join(dir, 'real-cursor');
  await mkdir(realCursor, { recursive: true });
  await writeFile(join(realCursor, 'hooks.json'), '{\n  "version": 1\n}\n', 'utf8');
  return attemptLink(realCursor, join(dir, '.cursor'));
}

describe('symlinked Claude Code configuration (T10.4, CR-01)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-sym-claude-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }).catch(() => {}); });

  it('installs Claude through junction, matches snapshots, and is idempotent', async (ctx) => {
    await requireLink(ctx, await setupClaudeRepo(tempDir), join(tempDir, '.claude'));
    const adapter = new ClaudeAdapter();
    const plan = await adapter.planInstall({ projectRoot: tempDir });
    const paths = ['.claude/settings.json', '.claude/hooks/context-brake.mjs', '.claude/hooks/context-brake-statusline.mjs'];
    const snapshots = await snapshotFiles(tempDir, paths);
    const configChange = plan.changes.find((c) => c.path === '.claude/settings.json');
    const configSnap = snapshots.find((s) => s.path === '.claude/settings.json');
    expect(configChange?.realPath).toBe(configSnap?.realPath);
    const changePlan = createChangePlan({ projectRoot: tempDir, plannedChanges: plan.changes, snapshots });
    const report = await new NodeChangeApplier().apply(changePlan);
    expect(report.status).toBe('success');
    expect((await lstat(join(tempDir, '.claude'))).isSymbolicLink()).toBe(true);
    const written = JSON.parse(await readFile(join(tempDir, '.agents/settings.json'), 'utf8')) as { hooks: Record<string, unknown> };
    expect(written.hooks.UserHook).toBe('node custom.js');
    expect(written.hooks.PreToolUse).toBeDefined();
    const secondSnaps = await snapshotFiles(tempDir, paths);
    const secondPlan = await adapter.planInstall({ projectRoot: tempDir });
    const secondChangePlan = createChangePlan({ projectRoot: tempDir, plannedChanges: secondPlan.changes, snapshots: secondSnaps });
    expect(secondChangePlan.changes).toHaveLength(0);
  });
});

describe('symlinked Cursor configuration (T10.4)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-sym-cursor-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }).catch(() => {}); });

  it('installs Cursor through junction and stays idempotent on second run', async (ctx) => {
    await requireLink(ctx, await setupCursorRepo(tempDir), join(tempDir, '.cursor'));
    const adapter = new CursorAdapter();
    const plan = await adapter.planInstall({ projectRoot: tempDir });
    const paths = ['.cursor/hooks.json', '.cursor/hooks/context-brake.mjs'];
    const snapshots = await snapshotFiles(tempDir, paths);
    const configChange = plan.changes.find((c) => c.path === '.cursor/hooks.json');
    const configSnap = snapshots.find((s) => s.path === '.cursor/hooks.json');
    expect(configChange?.realPath).toBe(configSnap?.realPath);
    const changePlan = createChangePlan({ projectRoot: tempDir, plannedChanges: plan.changes, snapshots });
    const report = await new NodeChangeApplier().apply(changePlan);
    expect(report.status).toBe('success');
    expect((await lstat(join(tempDir, '.cursor'))).isSymbolicLink()).toBe(true);
    const secondSnaps = await snapshotFiles(tempDir, paths);
    const secondPlan = await adapter.planInstall({ projectRoot: tempDir });
    const secondChangePlan = createChangePlan({ projectRoot: tempDir, plannedChanges: secondPlan.changes, snapshots: secondSnaps });
    expect(secondChangePlan.changes).toHaveLength(0);
  });
});
