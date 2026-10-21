import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { MOD_FILES } from '../../src/infrastructure/harnesses/claude-code/auto-restart-files.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';
import { addRuntimeError, BRIDGE_SCRIPT, CLAUDE_HOOK, CONFIG_FILE, createFixWorld, EDITED_HOOK_CONTENT, fileHashes, fixJson as fixJsonAt, installClaude, makeAssetModified, makeAssetOutdated, outcomeOf, readText, removeFixWorld } from '../helpers/fix-world.js';
import type { FixReport } from '../../src/core/contracts/fix-report.js';

const WATCHED = [CLAUDE_HOOK, BRIDGE_SCRIPT, CONFIG_FILE, '.context-brake/manifest.json', '.claude/settings.json'];
let root: string;

function fixJson(args: readonly string[]): Promise<FixReport> {
  return fixJsonAt(root, args);
}

beforeEach(async () => { root = await createFixWorld('cb-fix-'); });
afterEach(async () => { await removeFixWorld(root); });

describe('fix with --yes (FR-03, FR-09, FR-13, OBJ-01, TC-10, TC-16, TC-20)', () => {
  it('fixes an outdated asset, leaves doctor healthy, and writes nothing on a second run', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    const run = await runInProcessCli(['fix', '--yes'], root);
    expect([run.code, run.stdout.split('\n')[0]]).toEqual([0, 'ContextBrake fix: 1 fixable, 0 need a decision, 0 manual']);
    expect(run.stdout).toMatch(/FIXED\s+ASSET_OUTDATED/);
    expect(doctorReportSchema.parse(JSON.parse((await runInProcessCli(['doctor', '--json'], root)).stdout)).exitCode).toBe(0);
    const hashes = await fileHashes(root, WATCHED);
    expect((await fixJson(['--yes'])).stopped).toBe('nothing_to_fix');
    expect(await fileHashes(root, WATCHED)).toEqual(hashes);
  });

  it('keeps automatic restart on and reinstalls the missing mod files (FR-03, FR-10)', async () => {
    await installClaude(root, ['--auto-restart']);
    for (const path of MOD_FILES) await rm(join(root, path), { force: true });
    const report = await fixJson(['--yes']);
    expect(outcomeOf(report, 'AUTO_RESTART_OUTDATED_MOD')).toEqual(['fixed', 'Restart Claude Code to load the new mod.']);
    expect(JSON.parse(await readText(root, CONFIG_FILE))).toHaveProperty('autoRestart');
    for (const path of MOD_FILES) await expect(readText(root, path)).resolves.toBeTypeOf('string');
  });

  it('reports fixed, skipped, and manual outcomes and exits with the remaining warning', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    await makeAssetModified(root, BRIDGE_SCRIPT);
    await addRuntimeError(root);
    const report = await fixJson(['--yes']);
    expect([outcomeOf(report, 'ASSET_OUTDATED')?.[0], outcomeOf(report, 'ASSET_MODIFIED')?.[0], outcomeOf(report, 'RUNTIME_ERRORS_RECORDED')?.[0]]).toEqual(['fixed', 'skipped', 'manual']);
    expect([report.exitCode, await readText(root, BRIDGE_SCRIPT)]).toEqual([1, EDITED_HOOK_CONTENT]);
  });
});

describe('fix decisions without a terminal (FR-06, NFR-02, TC-13)', () => {
  it('keeps a modified file with --yes and replaces it with --yes --force', async () => {
    await installClaude(root);
    await makeAssetModified(root);
    expect(outcomeOf(await fixJson(['--yes']), 'ASSET_MODIFIED')?.[1]).toContain('--yes --force');
    expect(await readText(root, CLAUDE_HOOK)).toBe(EDITED_HOOK_CONTENT);
    expect(outcomeOf(await fixJson(['--yes', '--force']), 'ASSET_MODIFIED')?.[0]).toBe('fixed');
    expect(await readText(root, CLAUDE_HOOK)).not.toBe(EDITED_HOOK_CONTENT);
  });

  it('installs the harness that --harness names when no harness is active', async () => {
    await installClaude(root);
    await rm(join(root, '.claude'), { recursive: true, force: true });
    expect(outcomeOf(await fixJson(['--yes', '--force']), 'NO_PROJECT_HARNESS')?.[0]).toBe('skipped');
    const report = await fixJson(['--yes', '--force', '--harness', 'claude-code']);
    expect(outcomeOf(report, 'NO_PROJECT_HARNESS')?.[0]).toBe('fixed');
    expect(await readText(root, '.claude/settings.json')).toContain('context-brake');
  });
});

describe('fix skip of the inactive bridge (codereview_01 CR-01, DEC-05)', () => {
  it('keeps the manifest and the .gitignore block byte for byte', async () => {
    await mkdir(join(root, '.git'), { recursive: true });
    await installClaude(root);
    await writeFile(join(root, '.claude/settings.local.json'), '{\n  "statusLine": { "type": "command", "command": "personal.sh" }\n}\n', 'utf8');
    const owned = ['.context-brake/manifest.json', '.gitignore'];
    const hashes = await fileHashes(root, owned);
    expect(outcomeOf(await fixJson(['--yes']), 'STATUSLINE_BRIDGE_INACTIVE')?.[0]).toBe('skipped');
    expect(await fileHashes(root, owned)).toEqual(hashes);
    expect(await readText(root, '.gitignore')).toContain(BRIDGE_SCRIPT);
  });

  it('reinstalls the bridge with --yes --force (FR-06, codereview_02 OI-03)', async () => {
    await installClaude(root);
    await writeFile(join(root, '.claude/settings.local.json'), '{\n  "statusLine": { "type": "command", "command": "personal.sh" }\n}\n', 'utf8');
    expect(outcomeOf(await fixJson(['--yes', '--force']), 'STATUSLINE_BRIDGE_INACTIVE')?.[0]).toBe('fixed');
    expect(await readText(root, '.claude/settings.local.json')).toContain('context-brake-statusline');
  });
});
