import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';
import { createRunProject, PASSING_COMMAND, readFakeRecord, removeRunProject, runEnvironment, writePlan, type RunProject } from '../helpers/run-project.js';

const PERMISSION_FLAG = /permission|sandbox|approval|dangerously|yolo|bypass|full-auto/i;

let world: RunProject;
beforeEach(async () => {
  world = await createRunProject('cb-e2e-run-args-');
  await writePlan(world, [{ title: 'Only step', validationCommand: PASSING_COMMAND }]);
});
afterEach(async () => { await removeRunProject(world); });

describe('E2E run: harness permission modes stay at their defaults (TC-17, RF15, CA-11, DEC-18)', () => {
  it.each([
    ['claude-code', ['-p', '--output-format', 'stream-json', '--verbose']],
    ['codex-cli', ['exec', '--json', '-']],
  ])('launches %s with constant arguments only and prints the permission notice', async (harness, expected) => {
    const result = await runBuiltCli(['run', '--harness', harness, '--approve-commands'], world.project, await runEnvironment(world));
    expect(result.code).toBe(0);
    const record = await readFakeRecord(world);
    expect(record?.argv).toEqual(expected);
    expect(record?.argv.some((arg) => PERMISSION_FLAG.test(arg))).toBe(false);
    expect(result.stderr).toContain('[WARN] context-brake run leaves harness permission modes at their defaults');
  });
});

describe('E2E run: explicit harness arguments (TC-17, RF15, DEC-04, DEC-18)', () => {
  it('appends --harness-arg values verbatim, sends the prompt on stdin, and lists them in the summary', async () => {
    const args = ['run', '--harness', 'claude-code', '--approve-commands', '--json', '--harness-arg', '--permission-mode', '--harness-arg=acceptEdits'];
    const result = await runBuiltCli(args, world.project, await runEnvironment(world));
    expect(result.code).toBe(0);
    const record = await readFakeRecord(world);
    expect(record?.argv).toEqual(['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits']);
    expect(record?.stdin).toContain('Work only on step 1: Only step.');
    const summary = JSON.parse(result.stdout) as { harnessArgs: string[]; runId: string };
    expect(summary.harnessArgs).toEqual(['--permission-mode', 'acceptEdits']);
    expect(record?.runId).toBe(summary.runId);
  });

  it.skipIf(process.platform !== 'win32')('rejects a harness argument that cmd.exe would interpret before any session starts (Windows shim)', async () => {
    const result = await runBuiltCli(['run', '--harness', 'claude-code', '--approve-commands', '--harness-arg', 'a&b'], world.project, await runEnvironment(world));
    expect(result.code).toBe(64);
    expect(result.stderr).toContain('[ERROR] INVALID_ARGUMENTS:');
    expect(await readFakeRecord(world)).toBeNull();
  });
});
