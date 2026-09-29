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
const LEDGER = '.context-brake/runtime/sessions/claude-code/abc.jsonl';
const IGNORED: ProcessRunner = { discover: async () => [], run: async () => ({ status: 'completed', exitCode: 0, stdout: '', stderr: '' }) };
let root = '';
let home = '';
let installedCommand = '';

async function write(path: string, content: unknown): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}
async function install(command: string): Promise<void> {
  await write(LOCAL, { statusLine: { type: 'command', command } });
  await write(STATE, { v: 1, installedCommand: command, previousLocal: null, previousSource: 'project', previousCommand: 'project.sh', createdLocalFile: true });
}
async function recordShell(shell: string): Promise<void> {
  const line = { v: 1, type: 'statusline', at: '2026-09-29T12:00:00.000Z', windowTokens: 200000, inputTokens: 1000, usedPercentage: 1, model: 'claude-opus-5-5', shell };
  await write(LEDGER, `${JSON.stringify(line)}\n`);
}
async function codes(platform: NodeJS.Platform): Promise<string[]> {
  return (await diagnoseStatusline({ projectRoot: root, userHome: home, runner: IGNORED }, platform)).map((finding) => finding.code);
}

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'cb-statusline-shell-doctor-')));
  home = await mkdtemp(join(tmpdir(), 'cb-statusline-shell-doctor-home-'));
  installedCommand = `node "${toCommandRoot(root)}/${BRIDGE}"`;
  await write(BRIDGE, '');
  await write('.claude/settings.json', { statusLine: { type: 'command', command: 'project.sh' } });
  await install(installedCommand);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('status line shell and command format warnings (FR-04, FR-05, DEC-05, DEC-06, TC-06)', () => {
  it('flags the pipeline command of PRD-09 as outdated', async () => {
    await install(`${installedCommand} --pipe | ( project.sh\n)`);
    expect(await codes('linux')).toEqual(['STATUSLINE_BRIDGE_OUTDATED']);
  });
  it('warns on Windows after a bridge run through PowerShell', async () => {
    await recordShell('powershell');
    const findings = await diagnoseStatusline({ projectRoot: root, userHome: home, runner: IGNORED }, 'win32');
    expect(findings).toEqual([expect.objectContaining({ code: 'STATUSLINE_POWERSHELL_FALLBACK', severity: 'warning', remediation: expect.stringContaining('CLAUDE_CODE_GIT_BASH_PATH') as unknown })]);
  });
  it('stays quiet after a Git Bash run, without a recorded run, and outside Windows', async () => {
    expect(await codes('win32')).toEqual([]);
    await recordShell('git-bash');
    expect(await codes('win32')).toEqual([]);
    await recordShell('powershell');
    expect(await codes('linux')).toEqual([]);
  });
});
