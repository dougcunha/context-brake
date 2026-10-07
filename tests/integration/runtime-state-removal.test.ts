import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runRemove } from '../../src/cli/commands/remove.js';
import { fakeProcessRunner } from '../helpers/fake-process-runner.js';

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

describe('runtime-state removal on every remove (prd-12 FR-08, DEC-04, TC-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t04-b-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('deletes nested runtime-state files and prunes every emptied ContextBrake directory', async () => {
    await setupInstalledRepo(tempDir);
    await mkdir(join(tempDir, '.context-brake/runtime/sessions'), { recursive: true });
    await writeFile(join(tempDir, '.context-brake/runtime/lock.json'), '{}', 'utf8');
    await writeFile(join(tempDir, '.context-brake/runtime/sessions/s1.json'), '{}', 'utf8');
    const code = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true }, { projectRoot: tempDir, runner: fakeProcessRunner });
    expect(code).toBe(0);
    const runtimeDirExists = await stat(join(tempDir, '.context-brake/runtime')).then(() => true).catch(() => false);
    const contextBrakeDirExists = await stat(join(tempDir, '.context-brake')).then(() => true).catch(() => false);
    expect(runtimeDirExists).toBe(false);
    expect(contextBrakeDirExists).toBe(false);
  });

  it('plans and changes nothing when repeating remove after everything is already gone', async () => {
    await setupInstalledRepo(tempDir);
    await runRemove({ command: 'remove', dryRun: false, yes: true, json: true }, { projectRoot: tempDir, runner: fakeProcessRunner });
    const secondCode = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true }, { projectRoot: tempDir, runner: fakeProcessRunner });
    expect(secondCode).toBe(0);
  });
});

describe('runtime-state removal leaves stray content alone (prd-12 DEC-04, TC-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t04-c-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('keeps a file it does not own next to the runtime directory without a warning', async () => {
    await setupInstalledRepo(tempDir);
    await mkdir(join(tempDir, '.context-brake/runtime'), { recursive: true });
    await writeFile(join(tempDir, '.context-brake/runtime/lock.json'), '{}', 'utf8');
    await writeFile(join(tempDir, '.context-brake/stray.txt'), 'not ours', 'utf8');
    const result = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true }, { projectRoot: tempDir, runner: fakeProcessRunner });
    expect(result).toBe(0);
    const runtimeDirExists = await stat(join(tempDir, '.context-brake/runtime')).then(() => true).catch(() => false);
    const strayExists = await stat(join(tempDir, '.context-brake/stray.txt')).then(() => true).catch(() => false);
    expect(runtimeDirExists).toBe(false);
    expect(strayExists).toBe(true);
  });
});
