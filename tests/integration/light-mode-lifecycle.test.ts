import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { runHookInProcess, type InProcessHookResult } from '../helpers/in-process-hook.js';
import { removeProject } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, snapshotTree } from '../helpers/light-world.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const SESSION = 'light-e2e';
const E2E_TIMEOUT_MS = 120000;
const RESPONSE_CHARACTERS = 27400;
const GENERIC_RED = 'action=finish or pause the current unit and tell the user what remains';
const GENERIC_CRITICAL = 'action=stop starting new work; tell the user what remains';
const RUN_SNAPSHOT = 'action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]';
const SNAPSHOT_FLAGS = ['--snapshot-command', '/sdd-snapshot', '--resume-command', '/sdd-resume'];
const FORBIDDEN = /task_plan|state_checkpoint|validation|commit|blocked|sdd-|REQUEST_SESSION_RESET/;
const BRIDGE_FILES = ['.claude/settings.local.json', '.context-brake/runtime/claude-statusline.json'];
const LIGHT_FILES = ['.claude/hooks/context-brake-statusline.mjs', '.claude/hooks/context-brake.mjs', '.claude/settings.json', '.claude/settings.local.json', '.context-brake/manifest.json', '.context-brake/runtime/claude-statusline.json', 'context-brake.config.json'];
let root: string;
beforeEach(async () => { root = await createLightProject('cb-e2e-snapshot-'); });
afterEach(async () => { await removeProject(root); });

function hook(event: string, payload: Record<string, unknown>): Promise<InProcessHookResult> {
  const environment = { CLAUDE_PROJECT_DIR: root };
  return runHookInProcess({ harness: 'claude-code', projectRoot: root, event, payload: { session_id: SESSION, hook_event_name: event, ...payload }, environment });
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

describe('single mode with the built CLI and Claude Code hook (prd-12 TC-08, FR-06, FR-07)', () => {
  it('installs the minimal footprint, injects the generic actions without the marker, never denies, and shows the session in doctor', async () => {
    const before = await snapshotTree(root);
    const init = await runInProcessCli(['init', '--yes', '--json'], root);
    expect(init.code, init.stderr).toBe(0);
    expect(changedPaths(before, await snapshotTree(root))).toEqual(LIGHT_FILES);
    const blocks = await driveTo(12);
    expect(blocks[7]).toContain('zone=YELLOW action=keep working');
    expect(blocks[10]).toContain(`zone=RED ${GENERIC_RED}`);
    expect(blocks[11]).toContain(`zone=CRITICAL ${GENERIC_CRITICAL}`);
    expect(blocks.join('\n')).not.toMatch(FORBIDDEN);
    const write = await hook('PreToolUse', { tool_name: 'Write', tool_input: { file_path: join(root, 'src', 'app.ts'), content: '' }, tool_use_id: 'toolu_pre' });
    expect(write.stdout).toBe('');
    await writeFile(join(root, 'task_plan.json'), '{}', 'utf8');
    expect((await hook('SessionStart', { source: 'clear' })).stdout).toBe('');
    const doctor = JSON.parse((await runInProcessCli(['doctor', '--json'], root)).stdout) as DoctorReport;
    expect(doctor.snapshot).toEqual({ triggerZone: 'RED', command: null, resumeCommand: null });
    expect(doctor.activeSessions?.[0]).toMatchObject({ harness: 'claude-code', sessionId: SESSION });
  }, E2E_TIMEOUT_MS);

  it('accepts --debug and creates no instruction file', async () => {
    const before = await snapshotTree(root);
    expect((await runInProcessCli(['init', '--debug', '--yes', '--json'], root)).code).toBe(0);
    const doctor = JSON.parse((await runInProcessCli(['doctor', '--json'], root)).stdout) as DoctorReport;
    expect(doctor.debugMode).toBe(true);
    const after = await snapshotTree(root);
    expect(BRIDGE_FILES.every((path) => path in after)).toBe(true);
    expect(changedPaths(before, after).filter((path) => path.endsWith('.md'))).toEqual([]);
  }, E2E_TIMEOUT_MS);
});

describe('snapshot flags round trip with the built CLI (prd-12 TC-05, TC-07, TC-13, FR-04, FR-05)', () => {
  it('names the command at the trigger zone, resumes after a clear, and clears the commands again', async () => {
    expect((await runInProcessCli(['init', '--yes', '--json', ...SNAPSHOT_FLAGS], root)).code).toBe(0);
    const blocks = await driveTo(11);
    expect(blocks[7]).toContain('zone=YELLOW action=keep working');
    expect(blocks[10]).toContain(`zone=RED ${RUN_SNAPSHOT}`);
    expect(context((await hook('SessionStart', { source: 'clear' })).stdout)).toBe('[ContextBrake resume v1] Run "/sdd-resume" before continuing.');
    const configured = JSON.parse((await runInProcessCli(['doctor', '--json'], root)).stdout) as DoctorReport;
    expect(configured.snapshot).toEqual({ triggerZone: 'RED', command: '/sdd-snapshot', resumeCommand: '/sdd-resume' });
    expect((await runInProcessCli(['init', '--yes', '--json', '--no-snapshot-command'], root)).code).toBe(0);
    const cleared = JSON.parse((await runInProcessCli(['doctor', '--json'], root)).stdout) as DoctorReport;
    expect(cleared.snapshot).toEqual({ triggerZone: 'RED', command: null, resumeCommand: null });
  }, E2E_TIMEOUT_MS);

  it.each([['--light'], ['--no-light'], ['--snapshot-path', 'a.md']])('rejects the removed %s flag with exit 64', async (...flag) => {
    const run = await runInProcessCli(['init', '--yes', ...flag], root);
    expect(run.code).toBe(64);
  }, E2E_TIMEOUT_MS);
});
