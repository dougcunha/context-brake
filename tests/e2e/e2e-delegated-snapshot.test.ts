import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { installedHookPath, runInstalledHookWithEnvironment, type BuiltHookResult } from '../helpers/built-hook.js';
import { runBuiltCli } from './cli-runner.js';

const SESSION = 'delegated-e2e';
const E2E_TIMEOUT_MS = 120000;
const ACTION = 'action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]';
const PLAN_WORDS = /task_plan|state_checkpoint/;
const RESPONSE_CHARACTERS = 27400;
let root: string;
beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'cb-e2e-delegated-')));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude', 'settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(root, 'CLAUDE.md'), '# Rules\n', 'utf8');
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

function hook(event: string, payload: Record<string, unknown>): Promise<BuiltHookResult> {
  const environment = { ...process.env, CLAUDE_PROJECT_DIR: root };
  return runInstalledHookWithEnvironment({ hookPath: installedHookPath('claude-code', root), event, payload: { session_id: SESSION, hook_event_name: event, ...payload }, environment });
}
async function postTool(turn: number): Promise<string> {
  const result = await hook('PostToolUse', { tool_name: 'Read', tool_input: { file_path: join(root, 'CLAUDE.md') }, tool_response: 'x'.repeat(RESPONSE_CHARACTERS), tool_use_id: `toolu_${turn}` });
  return hookOutput(result.stdout).additionalContext ?? '';
}
async function preTool(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  return (await hook('PreToolUse', { tool_name: toolName, tool_input: toolInput, tool_use_id: 'toolu_pre' })).stdout;
}
type HookOutput = { readonly additionalContext?: string; readonly permissionDecision?: string; readonly permissionDecisionReason?: string };
function hookOutput(stdout: string): HookOutput {
  if (stdout.trim() === '') return {};
  return (JSON.parse(stdout) as { hookSpecificOutput?: HookOutput }).hookSpecificOutput ?? {};
}
async function driveTo(turn: number): Promise<string[]> {
  const blocks: string[] = [];
  for (let current = 1; current <= turn; current += 1) blocks.push(await postTool(current));
  return blocks;
}

describe('delegated snapshot mode with the built CLI and Claude Code hook (TC-14, OBJ-01, OBJ-02, OBJ-03)', () => {
  it('injects the snapshot command, brakes with the allowlist, and yields to a plan once it exists', async () => {
    const init = await runBuiltCli(['init', '--yes', '--json', '--snapshot-command', '/sdd-snapshot', '--snapshot-path', 'tasks/**/context-snapshot.md'], root);
    expect(init.code, init.stderr).toBe(0);
    const blocks = await driveTo(12);
    expect(blocks[7]).toContain('zone=YELLOW');
    expect(blocks[7]).not.toContain('sdd-snapshot');
    expect(blocks[10]).toContain(`zone=RED ${ACTION}`);
    expect(blocks[11]).toContain(`zone=CRITICAL ${ACTION}`);
    expect(blocks.join('\n')).not.toMatch(PLAN_WORDS);
    const denied = hookOutput(await preTool('Write', { file_path: join(root, 'src', 'app.ts'), content: '' }));
    expect(denied.permissionDecision).toBe('deny');
    expect(denied.permissionDecisionReason).toContain('Run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET].');
    expect(denied.permissionDecisionReason).not.toMatch(PLAN_WORDS);
    expect(await preTool('Write', { file_path: join(root, 'tasks', 'prd-x', 'context-snapshot.md'), content: '' })).toBe('');
    expect(await preTool('Skill', { skill: 'sdd-snapshot' })).toBe('');
    const doctor = JSON.parse((await runBuiltCli(['doctor', '--json'], root)).stdout) as DoctorReport;
    expect(doctor.checkpointMode).toMatchObject({ effective: 'delegated', reason: 'plan_missing' });
    expect((await runBuiltCli(['plan', 'init', '--task=e2e'], root)).code).toBe(0);
    const planBlock = await postTool(13);
    expect(planBlock).toContain('zone=CRITICAL action=other tools are blocked; finish the RED actions');
    expect(planBlock).not.toContain('sdd-snapshot');
  }, E2E_TIMEOUT_MS);
});
