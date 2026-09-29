import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { installedHookPath, runInstalledHookWithEnvironment, type BuiltHookResult } from '../helpers/built-hook.js';
import { removeProject } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, snapshotTree } from '../helpers/light-world.js';
import { runBuiltCli } from './cli-runner.js';

const SESSION = 'light-e2e';
const E2E_TIMEOUT_MS = 120000;
const RESPONSE_CHARACTERS = 27400;
const SAVE_NOW = 'action=save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]';
const SAVE_IMMEDIATELY = 'action=save your snapshot or checkpoint immediately, then end reply with [REQUEST_SESSION_RESET]';
const FORBIDDEN = /task_plan|state_checkpoint|validation|commit|blocked|sdd-/;
const BRIDGE_FILES = ['.claude/settings.local.json', '.context-brake/runtime/claude-statusline.json'];
const LIGHT_FILES = ['.claude/hooks/context-brake-statusline.mjs', '.claude/hooks/context-brake.mjs', '.claude/settings.json', '.claude/settings.local.json', '.context-brake/manifest.json', '.context-brake/runtime/claude-statusline.json', 'context-brake.config.json'];
const MANAGED_FILES = ['CLAUDE.md', 'AGENTS.md', 'docs/context-brake-protocol.md', '.gitignore', 'context-brake.config.json'];
let root: string;
beforeEach(async () => { root = await createLightProject('cb-e2e-light-'); });
afterEach(async () => { await removeProject(root); });

function hook(event: string, payload: Record<string, unknown>): Promise<BuiltHookResult> {
  const environment = { ...process.env, CLAUDE_PROJECT_DIR: root };
  return runInstalledHookWithEnvironment({ hookPath: installedHookPath('claude-code', root), event, payload: { session_id: SESSION, hook_event_name: event, ...payload }, environment });
}
function context(stdout: string): string {
  if (stdout.trim() === '') return '';
  return (JSON.parse(stdout) as { hookSpecificOutput?: { additionalContext?: string } }).hookSpecificOutput?.additionalContext ?? '';
}
async function driveTo(turns: number): Promise<string[]> {
  const blocks: string[] = [];
  for (let turn = 1; turn <= turns; turn += 1) {
    const result = await hook('PostToolUse', { tool_name: 'Read', tool_input: { file_path: join(root, 'CLAUDE.md') }, tool_response: 'x'.repeat(RESPONSE_CHARACTERS), tool_use_id: `toolu_${turn}` });
    blocks.push(context(result.stdout));
  }
  return blocks;
}

describe('light mode with the built CLI and Claude Code hook (TC-13, OBJ-01, OBJ-02, OBJ-03, OBJ-05)', () => {
  it('installs the minimal footprint with the bridge, injects only light telemetry, never denies, and shows the session in doctor', async () => {
    const before = await snapshotTree(root);
    const init = await runBuiltCli(['init', '--yes', '--json', '--light'], root);
    expect(init.code, init.stderr).toBe(0);
    expect(changedPaths(before, await snapshotTree(root))).toEqual(LIGHT_FILES);
    const blocks = await driveTo(12);
    expect(blocks[7]).toContain('zone=YELLOW action=keep working');
    expect(blocks[10]).toContain(`zone=RED ${SAVE_NOW}`);
    expect(blocks[11]).toContain(`zone=CRITICAL ${SAVE_IMMEDIATELY}`);
    expect(blocks.join('\n')).not.toMatch(FORBIDDEN);
    const write = await hook('PreToolUse', { tool_name: 'Write', tool_input: { file_path: join(root, 'src', 'app.ts'), content: '' }, tool_use_id: 'toolu_pre' });
    expect(write.stdout).toBe('');
    await writeFile(join(root, 'task_plan.json'), '{}', 'utf8');
    expect((await hook('SessionStart', { source: 'clear' })).stdout).toBe('');
    const doctor = JSON.parse((await runBuiltCli(['doctor', '--json'], root)).stdout) as DoctorReport;
    expect(doctor.checkpointMode).toMatchObject({ effective: 'light', reason: 'light_mode', lightMode: { triggerZone: 'RED' } });
    expect(doctor.activeSessions?.[0]).toMatchObject({ harness: 'claude-code', sessionId: SESSION });
  }, E2E_TIMEOUT_MS);
});

describe('a plain init is the light mode (TC-14, FR-07, FR-08, FR-09, NFR-01)', () => {
  it('installs light mode with the bridge, accepts --debug, and creates no instruction file', async () => {
    const before = await snapshotTree(root);
    const init = await runBuiltCli(['init', '--yes', '--json'], root);
    expect(init.code, init.stderr).toBe(0);
    expect(changedPaths(before, await snapshotTree(root))).toEqual(LIGHT_FILES);
    expect(changedPaths(before, await snapshotTree(root)).filter((path) => path.endsWith('.md'))).toEqual([]);
    expect((await runBuiltCli(['init', '--debug', '--yes', '--json'], root)).code).toBe(0);
    const doctor = JSON.parse((await runBuiltCli(['doctor', '--json'], root)).stdout) as DoctorReport;
    expect(doctor.checkpointMode).toMatchObject({ effective: 'light' });
    expect(doctor.debugMode).toBe(true);
    const afterDebug = await snapshotTree(root);
    expect(BRIDGE_FILES.every((path) => path in afterDebug)).toBe(true);
    expect(changedPaths(before, afterDebug).filter((path) => path.endsWith('.md'))).toEqual([]);
  }, E2E_TIMEOUT_MS);

  it('keeps full mode on a plain init once init --no-light recorded the choice (FR-08, TC-12)', async () => {
    expect((await runBuiltCli(['init', '--yes', '--json', '--no-light'], root)).code).toBe(0);
    const full = await snapshotTree(root);
    expect(full['docs/context-brake-protocol.md']).toBeDefined();
    const again = await runBuiltCli(['init', '--yes', '--json'], root);
    expect(again.code, again.stderr).toBe(0);
    expect(await snapshotTree(root)).toEqual(full);
    expect((await runBuiltCli(['init', '--yes', '--json', '--light'], root)).code).toBe(0);
    const light = await snapshotTree(root);
    expect([light['docs/context-brake-protocol.md'], light['.gitignore']]).toEqual([undefined, undefined]);
  }, E2E_TIMEOUT_MS);
});

describe('full install to light mode and back with the built CLI (TC-13, FR-09)', () => {
  it('removes the managed files and restores a fresh full install', async () => {
    const fresh = await createLightProject('cb-e2e-light-fresh-');
    try {
      expect((await runBuiltCli(['init', '--yes', '--json', '--no-light'], fresh)).code).toBe(0);
      expect((await runBuiltCli(['init', '--yes', '--json', '--no-light'], root)).code).toBe(0);
      expect((await runBuiltCli(['init', '--yes', '--json', '--light'], root)).code).toBe(0);
      const light = await snapshotTree(root);
      expect([light['docs/context-brake-protocol.md'], light['.gitignore']]).toEqual([undefined, undefined]);
      expect((await runBuiltCli(['init', '--yes', '--json', '--no-light'], root)).code).toBe(0);
      const [restored, expected] = [await snapshotTree(root), await snapshotTree(fresh)];
      for (const path of MANAGED_FILES) expect(restored[path], path).toBe(expected[path]);
    } finally {
      await removeProject(fresh);
    }
  }, E2E_TIMEOUT_MS);
});
