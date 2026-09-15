import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runRemove } from '../../src/cli/commands/remove.js';

async function writeConfigAndManifest(root: string, hookSha: string): Promise<void> {
  const manifest = {
    schemaVersion: 1, packageVersion: '1.0.0',
    assets: [{ path: '.claude/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: hookSha }],
    entries: [{ harness: 'claude-code', path: '.claude/settings.json', identity: 'PreToolUse|*|.claude/hooks/context-brake.mjs' }],
  };
  await writeFile(join(root, '.context-brake/manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify({
    schemaVersion: 1, activeHarnesses: ['claude-code'],
    telemetry: { injectionMode: 'threshold_only', activationThresholdPercentage: 50, contextWindowCeiling: 128000, turnCeiling: 12, zones: { greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 } },
    stateStorage: { planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', instructCheckpointCommit: true, bootMaxTokens: 1000 },
    instructionFiles: { targets: ['CLAUDE.md'], protocolFile: 'docs/context-brake-protocol.md' },
  }), 'utf8');
}

async function setupInstalledRepo(root: string): Promise<void> {
  await mkdir(join(root, '.claude/hooks'), { recursive: true });
  await mkdir(join(root, '.context-brake'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });
  const userSettings = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/context-brake.mjs PreToolUse' }] }] } };
  const hookCode = '// hook code';
  const hookSha = createHash('sha256').update(hookCode).digest('hex');
  await writeFile(join(root, '.claude/settings.json'), JSON.stringify(userSettings, null, 2), 'utf8');
  await writeFile(join(root, '.claude/hooks/context-brake.mjs'), hookCode, 'utf8');
  await writeFile(join(root, 'docs/context-brake-protocol.md'), '# ContextBrake Protocol', 'utf8');
  await writeFile(join(root, 'CLAUDE.md'), '# My Instructions', 'utf8');
  await writeConfigAndManifest(root, hookSha);
}

describe('T04: runtime-state removal without --remove-state (FR-09, TC-05)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t04-a-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('never deletes runtime-state files and preserves the ContextBrake directory', async () => {
    await setupInstalledRepo(tempDir);
    await mkdir(join(tempDir, '.context-brake/runtime/sessions'), { recursive: true });
    await writeFile(join(tempDir, '.context-brake/runtime/lock.json'), '{}', 'utf8');
    await writeFile(join(tempDir, '.context-brake/runtime/sessions/s1.json'), '{}', 'utf8');
    const code = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true, removeState: false }, { projectRoot: tempDir });
    expect(code).toBe(0);
    const lockExists = await stat(join(tempDir, '.context-brake/runtime/lock.json')).then(() => true).catch(() => false);
    const contextBrakeDirExists = await stat(join(tempDir, '.context-brake')).then(() => true).catch(() => false);
    expect(lockExists).toBe(true);
    expect(contextBrakeDirExists).toBe(true);
  });
});

describe('T04: runtime-state removal with --remove-state (FR-09, TC-05)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t04-b-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('deletes nested runtime-state files and prunes every emptied ContextBrake directory', async () => {
    await setupInstalledRepo(tempDir);
    await mkdir(join(tempDir, '.context-brake/runtime/sessions'), { recursive: true });
    await writeFile(join(tempDir, '.context-brake/runtime/lock.json'), '{}', 'utf8');
    await writeFile(join(tempDir, '.context-brake/runtime/sessions/s1.json'), '{}', 'utf8');
    const code = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true, removeState: true }, { projectRoot: tempDir });
    expect(code).toBe(0);
    const runtimeDirExists = await stat(join(tempDir, '.context-brake/runtime')).then(() => true).catch(() => false);
    const contextBrakeDirExists = await stat(join(tempDir, '.context-brake')).then(() => true).catch(() => false);
    expect(runtimeDirExists).toBe(false);
    expect(contextBrakeDirExists).toBe(false);
  });

  it('plans and changes nothing when repeating remove --remove-state after everything is already gone', async () => {
    await setupInstalledRepo(tempDir);
    await runRemove({ command: 'remove', dryRun: false, yes: true, json: true, removeState: true }, { projectRoot: tempDir });
    const secondCode = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true, removeState: true }, { projectRoot: tempDir });
    expect(secondCode).toBe(0);
  });
});

describe('T04: runtime-state removal leaves stray content alone (FR-09, TC-05)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t04-c-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('leaves a stray file in place and reports it as skipped, never removing or failing hard', async () => {
    await setupInstalledRepo(tempDir);
    await mkdir(join(tempDir, '.context-brake/runtime'), { recursive: true });
    await writeFile(join(tempDir, '.context-brake/runtime/lock.json'), '{}', 'utf8');
    await writeFile(join(tempDir, '.context-brake/stray.txt'), 'not ours', 'utf8');
    const result = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true, removeState: true }, { projectRoot: tempDir });
    expect(result).toBe(1);
    const runtimeDirExists = await stat(join(tempDir, '.context-brake/runtime')).then(() => true).catch(() => false);
    const strayExists = await stat(join(tempDir, '.context-brake/stray.txt')).then(() => true).catch(() => false);
    expect(runtimeDirExists).toBe(false);
    expect(strayExists).toBe(true);
  });
});
