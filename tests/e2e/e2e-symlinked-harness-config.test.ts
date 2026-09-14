import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';
import { runBuiltCli } from './cli-runner.js';
import { attemptLink, type LinkAttempt, linkExists, requireLink } from '../helpers/link-capability.js';

async function setupJunctionRepo(dir: string): Promise<LinkAttempt> {
  const realAgents = join(dir, '.agents');
  await mkdir(realAgents, { recursive: true });
  const settings = JSON.stringify({ hooks: { UserHook: 'node custom.js' } }, null, 2);
  await writeFile(join(realAgents, 'settings.json'), `${settings}\n`, 'utf8');
  await writeFile(join(dir, 'CLAUDE.md'), '# Claude Guide\n', 'utf8');
  return attemptLink(realAgents, join(dir, '.claude'));
}

describe('E2E symlinked harness install and idempotency (T10.5, CR-01)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-sym-a-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {}); });

  it('runs init --yes on junction fixture, succeeds, and second run is byte-identical', async (ctx) => {
    await requireLink(ctx, await setupJunctionRepo(tempDir), join(tempDir, '.claude'));
    expect(await linkExists(join(tempDir, '.claude'))).toBe(true);
    const first = await runBuiltCli(['init', '--yes'], tempDir);
    expect(first.code).toBe(0);
    expect(first.stderr).not.toContain('UNEXPECTED_ERROR');
    expect((await lstat(join(tempDir, '.claude'))).isSymbolicLink()).toBe(true);
    const settingsPath = join(tempDir, '.agents/settings.json');
    const contentAfterFirst = await readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(contentAfterFirst) as { hooks: Record<string, unknown> };
    expect(parsed.hooks.UserHook).toBe('node custom.js');
    expect(parsed.hooks.PreToolUse).toBeDefined();
    const second = await runBuiltCli(['init', '--yes'], tempDir);
    expect(second.code).toBe(0);
    expect(await readFile(settingsPath, 'utf8')).toBe(contentAfterFirst);
  });
});

describe('E2E symlinked harness concurrency rejection (T10.5)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-sym-b-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {}); });

  it('yields FILE_CHANGED_SINCE_PREVIEW when file changes between plan and apply', async (ctx) => {
    await requireLink(ctx, await setupJunctionRepo(tempDir), join(tempDir, '.claude'));
    const adapter = new ClaudeAdapter();
    const planResult = await adapter.planInstall({ projectRoot: tempDir });
    const paths = ['.claude/settings.json', '.claude/hooks/context-brake.mjs'];
    const snaps = await snapshotFiles(tempDir, paths);
    const changePlan = createChangePlan({ projectRoot: tempDir, plannedChanges: planResult.changes, snapshots: snaps });
    const realTarget = join(tempDir, '.agents/settings.json');
    await writeFile(realTarget, '{\n  "hooks": { "ConcurrentEdit": true }\n}\n', 'utf8');
    const report = await new NodeChangeApplier().apply(changePlan);
    expect(report.status).toBe('errors');
    expect(report.exitCode).toBe(2);
    const failedOutcome = report.outcomes.find((o) => o.path === '.claude/settings.json');
    expect(failedOutcome?.status).toBe('failed');
    expect(failedOutcome?.detail).toContain('FILE_CHANGED_SINCE_PREVIEW');
  });
});
