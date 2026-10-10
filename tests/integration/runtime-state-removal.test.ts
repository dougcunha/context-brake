import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runRemove } from '../../src/cli/commands/remove.js';
import { fakeProcessRunner } from '../helpers/fake-process-runner.js';

const STRAY = '.context-brake/stray.txt';
const STRAY_CONTENT = 'not ours';

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
  await mkdir(join(root, '.context-brake/runtime'), { recursive: true });
  const userSettings = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/context-brake.mjs PreToolUse' }] }] } };
  const hookCode = '// hook code';
  const hookSha = createHash('sha256').update(hookCode).digest('hex');
  await writeFile(join(root, '.claude/settings.json'), JSON.stringify(userSettings, null, 2), 'utf8');
  await writeFile(join(root, '.claude/hooks/context-brake.mjs'), hookCode, 'utf8');
  await writeFile(join(root, '.context-brake/runtime/lock.json'), '{}', 'utf8');
  await writeFile(join(root, STRAY), STRAY_CONTENT, 'utf8');
  await writeConfigAndManifest(root, hookSha);
}

function remove(root: string): Promise<number> {
  return runRemove({ command: 'remove', dryRun: false, yes: true, json: true }, { projectRoot: root, runner: fakeProcessRunner });
}

describe('runtime-state removal leaves stray content alone (prd-12 FR-08, DEC-04, TC-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t04-c-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('deletes the runtime directory, keeps a file it does not own next to it, and a second remove succeeds and still keeps that file', async () => {
    await setupInstalledRepo(tempDir);
    expect(await remove(tempDir)).toBe(0);
    expect(await stat(join(tempDir, '.context-brake/runtime')).then(() => true).catch(() => false)).toBe(false);
    expect(await remove(tempDir)).toBe(0);
    expect(await readFile(join(tempDir, STRAY), 'utf8')).toBe(STRAY_CONTENT);
  });
});
