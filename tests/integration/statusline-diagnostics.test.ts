import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { diagnoseStatusline } from '../../src/infrastructure/harnesses/claude-code/statusline-diagnostics.js';
import { toCommandRoot } from '../../src/infrastructure/harnesses/claude-code/statusline-settings.js';

const BRIDGE = '.claude/hooks/context-brake-statusline.mjs';
const LOCAL = '.claude/settings.local.json';
const PROJECT = '.claude/settings.json';
const STATE = '.context-brake/runtime/claude-statusline.json';
const PROJECT_STATUSLINE = { statusLine: { type: 'command', command: 'project.sh' } };
const RECORDED_LOCAL = { previousLocal: { type: 'command', command: 'local.sh' }, previousSource: 'local', previousCommand: 'local.sh' };
const RECORDED_USER = { previousSource: 'user', previousCommand: 'user.sh' };
let root = '';
let home = '';
let installedCommand = '';

function runnerExiting(exitCode: number): ProcessRunner {
  return { discover: async () => [], run: async () => ({ status: exitCode === 0 ? 'completed' : 'failed', exitCode, stdout: '', stderr: '' }) };
}
async function write(path: string, content: unknown): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}
async function writeState(recorded: object): Promise<void> {
  await write(STATE, { v: 1, installedCommand, previousLocal: null, previousSource: 'project', previousCommand: 'project.sh', createdLocalFile: true, ...recorded });
}
async function codes(exitCode = 0): Promise<string[]> {
  return (await diagnoseStatusline({ projectRoot: root, userHome: home, runner: runnerExiting(exitCode) }, 'linux')).map((finding) => finding.code);
}
beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'cb-statusline-doctor-')));
  home = await mkdtemp(join(tmpdir(), 'cb-statusline-doctor-home-'));
  installedCommand = `node "${toCommandRoot(root)}/${BRIDGE}"`;
  await write(BRIDGE, '');
  await write(PROJECT, PROJECT_STATUSLINE);
  await mkdir(join(home, '.claude'), { recursive: true });
  await writeFile(join(home, PROJECT), JSON.stringify({ statusLine: { type: 'command', command: 'user.sh' } }), 'utf8');
  await write(LOCAL, { statusLine: { type: 'command', command: installedCommand } });
  await writeState({});
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('status line bridge doctor warnings (FR-07, DEC-10, TC-16)', () => {
  it.each([
    { scope: 'project', recorded: {}, project: PROJECT_STATUSLINE },
    { scope: 'local', recorded: RECORDED_LOCAL, project: PROJECT_STATUSLINE },
    { scope: 'user', recorded: RECORDED_USER, project: {} },
  ])('reports nothing for a healthy install with the $scope status line recorded at install', async ({ recorded, project }) => {
    await writeState(recorded);
    await write(PROJECT, project);
    expect(await codes()).toEqual([]);
  });
  it('reports nothing when the bridge was never installed', async () => {
    await rm(join(root, STATE));
    expect(await codes(1)).toEqual([]);
  });
  it('warns about a state file that does not parse', async () => {
    await write(STATE, '{ "v": 2 }');
    expect(await codes()).toEqual(['STATUSLINE_STATE_INVALID']);
  });
  it('gives the inactive bridge, missing script, changed previous command, and tracked local file a warning with remediation', async () => {
    await write(LOCAL, {});
    await rm(join(root, BRIDGE));
    await write(PROJECT, { statusLine: { type: 'command', command: 'project-v2.sh' } });
    const findings = await diagnoseStatusline({ projectRoot: root, userHome: home, runner: runnerExiting(1) });
    expect(findings.map((finding) => finding.code)).toEqual(['STATUSLINE_BRIDGE_INACTIVE', 'STATUSLINE_BRIDGE_MISSING_SCRIPT', 'STATUSLINE_PREVIOUS_CHANGED', 'STATUSLINE_LOCAL_TRACKED']);
    for (const finding of findings) expect(finding).toMatchObject({ severity: 'warning', harness: 'claude-code', remediation: expect.stringMatching(/^(Run|Add) /) as unknown });
  });
});
