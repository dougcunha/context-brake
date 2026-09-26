import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { diagnoseStatusline } from '../../src/infrastructure/harnesses/claude-code/statusline-diagnostics.js';
import { toCommandRoot } from '../../src/infrastructure/harnesses/claude-code/statusline-settings.js';

const BRIDGE = '.claude/hooks/context-brake-statusline.mjs';
const LOCAL = '.claude/settings.local.json';
const STATE = '.context-brake/runtime/claude-statusline.json';
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
async function codes(exitCode = 0): Promise<string[]> {
  return (await diagnoseStatusline({ projectRoot: root, userHome: home, runner: runnerExiting(exitCode) })).map((finding) => finding.code);
}

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'cb-statusline-doctor-')));
  home = await mkdtemp(join(tmpdir(), 'cb-statusline-doctor-home-'));
  installedCommand = `node "${toCommandRoot(root)}/${BRIDGE}" --pipe | ( project.sh )`;
  await write(BRIDGE, '');
  await write('.claude/settings.json', { statusLine: { type: 'command', command: 'project.sh' } });
  await write(LOCAL, { statusLine: { type: 'command', command: installedCommand } });
  await write(STATE, { v: 1, installedCommand, previousLocal: null, previousSource: 'project', previousCommand: 'project.sh', createdLocalFile: true });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('status line bridge doctor warnings (FR-07, DEC-10, TC-16)', () => {
  it('reports nothing for a healthy install', async () => {
    expect(await codes()).toEqual([]);
  });

  it('reports nothing when the bridge was never installed', async () => {
    await rm(join(root, STATE));
    expect(await codes(1)).toEqual([]);
  });

  it('warns when the local status line no longer runs the bridge', async () => {
    await write(LOCAL, { statusLine: { type: 'command', command: 'mine.sh' } });
    expect(await codes()).toEqual(['STATUSLINE_BRIDGE_INACTIVE']);
  });

  it('warns when the bridge script is missing at the recorded root', async () => {
    await rm(join(root, BRIDGE));
    expect(await codes()).toEqual(['STATUSLINE_BRIDGE_MISSING_SCRIPT']);
  });

});

describe('status line bridge doctor drift warnings (FR-07, DEC-10, TC-16)', () => {
  it('warns when the project status line changed after install', async () => {
    await write('.claude/settings.json', { statusLine: { type: 'command', command: 'project-v2.sh' } });
    expect(await codes()).toEqual(['STATUSLINE_PREVIOUS_CHANGED']);
  });

  it('warns when the user status line now takes precedence', async () => {
    await write('.claude/settings.json', {});
    await mkdir(join(home, '.claude'), { recursive: true });
    await writeFile(join(home, '.claude', 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: 'user.sh' } }), 'utf8');
    expect(await codes()).toEqual(['STATUSLINE_PREVIOUS_CHANGED']);
  });

  it('warns when git reports the local settings as not ignored', async () => {
    expect(await codes(1)).toEqual(['STATUSLINE_LOCAL_TRACKED']);
  });

  it('warns about a state file that does not parse', async () => {
    await write(STATE, '{ "v": 2 }');
    expect(await codes()).toEqual(['STATUSLINE_STATE_INVALID']);
  });

  it('gives every warning a remediation', async () => {
    await write(LOCAL, {});
    await rm(join(root, BRIDGE));
    const findings = await diagnoseStatusline({ projectRoot: root, userHome: home, runner: runnerExiting(1) });
    expect(findings.length).toBe(3);
    expect(findings.map((finding) => finding.code)).toEqual(['STATUSLINE_BRIDGE_INACTIVE', 'STATUSLINE_BRIDGE_MISSING_SCRIPT', 'STATUSLINE_LOCAL_TRACKED']);
    for (const finding of findings) expect(finding).toMatchObject({ severity: 'warning', harness: 'claude-code', remediation: expect.stringMatching(/^(Run|Add) /) as unknown });
  });
});
