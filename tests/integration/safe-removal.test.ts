import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runRemove } from '../../src/cli/commands/remove.js';
import { fakeProcessRunner } from '../helpers/fake-process-runner.js';

const USER_ONLY_SETTINGS = JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'bash', hooks: [{ type: 'command', command: 'echo user-post' }] }] } }, null, 2);
const LEGACY_CLAUDE_MD ='# My Instructions\n\n<!-- CONTEXTBRAKE:START -->\nfollow docs/context-brake-protocol.md\n<!-- CONTEXTBRAKE:END -->\n\n# User Section\nKeep this.';

async function writeConfigAndManifest(root: string, hookSha: string) {
  const manifest = {
    schemaVersion: 1, packageVersion: '1.0.0',
    assets: [{ path: '.claude/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: hookSha }],
    entries: [{ harness: 'claude-code', path: '.claude/settings.json', identity: 'PostToolUse|*|.claude/hooks/context-brake.mjs' }],
  };
  await writeFile(join(root, '.context-brake/manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify({
    schemaVersion: 1, activeHarnesses: ['claude-code'],
    telemetry: { injectionMode: 'threshold_only', activationThresholdPercentage: 50, contextWindowCeiling: 128000, turnCeiling: 12, zones: { greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 } },
  }), 'utf8');
}

async function setupInstalledRepo(root: string) {
  await mkdir(join(root, '.claude/hooks'), { recursive: true });
  await mkdir(join(root, '.context-brake'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });
  const userSettings = {
    hooks: {
      PostToolUse: [
        { matcher: 'bash', hooks: [{ type: 'command', command: 'echo user-post' }] },
        { matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/context-brake.mjs PostToolUse' }] },
      ],
    },
  };
  const hookCode = '// hook code';
  const hookSha = createHash('sha256').update(hookCode).digest('hex');
  await writeFile(join(root, '.claude/settings.json'), JSON.stringify(userSettings, null, 2), 'utf8');
  await writeFile(join(root, '.claude/hooks/context-brake.mjs'), hookCode, 'utf8');
  await writeFile(join(root, 'docs/context-brake-protocol.md'), '# ContextBrake Protocol', 'utf8');
  await writeFile(join(root, 'task_plan.json'), JSON.stringify({ task: '1' }), 'utf8');
  await writeFile(join(root, 'state_checkpoint.json'), JSON.stringify({ step: 1 }), 'utf8');
  await writeFile(join(root, 'CLAUDE.md'), LEGACY_CLAUDE_MD, 'utf8');
  await writeConfigAndManifest(root, hookSha);
}

describe('IT-09: Removal leaves files it does not own untouched (CA-12, FR-08, TC-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it09-a-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('preserves user settings, instruction files, the protocol file, and old plan files', async () => {
    await setupInstalledRepo(tempDir);
    const code = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true }, { projectRoot: tempDir, runner: fakeProcessRunner });
    expect(code).toBe(0);
    const settings = await readFile(join(tempDir, '.claude/settings.json'), 'utf8');
    expect(settings).toBe(USER_ONLY_SETTINGS);
    await runRemove({ command: 'remove', dryRun: false, yes: true, json: true }, { projectRoot: tempDir, runner: fakeProcessRunner });
    expect(await readFile(join(tempDir, '.claude/settings.json'), 'utf8')).toBe(settings);
    expect(await readFile(join(tempDir, 'CLAUDE.md'), 'utf8')).toBe(LEGACY_CLAUDE_MD);
    expect(await readFile(join(tempDir, 'docs/context-brake-protocol.md'), 'utf8')).toBe('# ContextBrake Protocol');
    const planExists = await stat(join(tempDir, 'task_plan.json')).then(() => true).catch(() => false);
    const chkExists = await stat(join(tempDir, 'state_checkpoint.json')).then(() => true).catch(() => false);
    expect(planExists).toBe(true);
    expect(chkExists).toBe(true);
  });
});
