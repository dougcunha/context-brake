import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runRemove } from '../../src/cli/commands/remove.js';
import { CURRENT_START_MARKER, CURRENT_END_MARKER } from '../../src/core/services/instruction-markers.js';

async function writeConfigAndManifest(root: string, hookSha: string) {
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

async function setupInstalledRepo(root: string) {
  await mkdir(join(root, '.claude/hooks'), { recursive: true });
  await mkdir(join(root, '.context-brake'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });
  const userSettings = {
    hooks: {
      PreToolUse: [
        { matcher: 'bash', hooks: [{ type: 'command', command: 'echo user-pre' }] },
        { matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/context-brake.mjs PreToolUse' }] },
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
  await writeFile(join(root, 'CLAUDE.md'), `# My Instructions\n\n${CURRENT_START_MARKER}\nfollow docs/context-brake-protocol.md\n${CURRENT_END_MARKER}\n\n# User Section\nKeep this.`, 'utf8');
  await writeConfigAndManifest(root, hookSha);
}

describe('IT-09: Default removal preserves state (CA-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it09-a-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('preserves user settings and state files during default removal', async () => {
    await setupInstalledRepo(tempDir);
    const code = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true, removeState: false }, { projectRoot: tempDir });
    expect(code).toBe(0);
    const settings = JSON.parse(await readFile(join(tempDir, '.claude/settings.json'), 'utf8'));
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(settings.hooks.PreToolUse[0].matcher).toBe('bash');
    const claudeMd = await readFile(join(tempDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).not.toContain(CURRENT_START_MARKER);
    expect(claudeMd).toContain('# User Section');
    const planExists = await stat(join(tempDir, 'task_plan.json')).then(() => true).catch(() => false);
    const chkExists = await stat(join(tempDir, 'state_checkpoint.json')).then(() => true).catch(() => false);
    expect(planExists).toBe(true);
    expect(chkExists).toBe(true);
  });
});

describe('IT-09: Explicit state removal (CA-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it09-b-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('removes state files when removeState: true is passed', async () => {
    await setupInstalledRepo(tempDir);
    const code = await runRemove({ command: 'remove', dryRun: false, yes: true, json: true, removeState: true }, { projectRoot: tempDir });
    expect(code).toBe(0);
    const planExists = await stat(join(tempDir, 'task_plan.json')).then(() => true).catch(() => false);
    const chkExists = await stat(join(tempDir, 'state_checkpoint.json')).then(() => true).catch(() => false);
    expect(planExists).toBe(false);
    expect(chkExists).toBe(false);
  });
});
