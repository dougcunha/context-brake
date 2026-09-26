import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProcessRequest, ProcessRunner } from '../../src/core/contracts/processes.js';
import { diagnoseStatusline } from '../../src/infrastructure/harnesses/claude-code/statusline-diagnostics.js';
import { toCommandRoot } from '../../src/infrastructure/harnesses/claude-code/statusline-settings.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

const LINK_LOCAL = '.claude/settings.local.json';
const REAL_LOCAL = '.agents/settings.local.json';
const STATE = '.context-brake/runtime/claude-statusline.json';
let root = '';
let home = '';

function runnerNotIgnoring(notIgnored: readonly string[], checked: string[]): ProcessRunner {
  return {
    discover: async () => [],
    run: async (request: ProcessRequest) => {
      const path = request.args.at(-1) ?? '';
      checked.push(path);
      const exitCode = notIgnored.includes(path) ? 1 : 0;
      return { status: exitCode === 0 ? 'completed' : 'failed', exitCode, stdout: '', stderr: '' };
    },
  };
}
async function write(path: string, content: unknown): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), JSON.stringify(content), 'utf8');
}
async function diagnose(notIgnored: readonly string[], checked: string[] = []): Promise<string[]> {
  const findings = await diagnoseStatusline({ projectRoot: root, userHome: home, runner: runnerNotIgnoring(notIgnored, checked) });
  return findings.map((finding) => finding.code);
}

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'cb-statusline-symlink-')));
  home = await mkdtemp(join(tmpdir(), 'cb-statusline-symlink-home-'));
  const installedCommand = `node "${toCommandRoot(root)}/.claude/hooks/context-brake-statusline.mjs"`;
  await write('.agents/hooks/context-brake-statusline.mjs', '');
  await write(REAL_LOCAL, { statusLine: { type: 'command', command: installedCommand } });
  await write(STATE, { v: 1, installedCommand, previousLocal: null, previousSource: null, previousCommand: null, createdLocalFile: true });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('tracked local settings through a symlinked .claude (FR-07, DEC-10, TC-16, codereview_01/CR-02)', () => {
  it('warns when the link path is ignored but the real target is not', async (ctx) => {
    await requireLink(ctx, await attemptLink(join(root, '.agents'), join(root, '.claude')), join(root, '.claude'));
    const checked: string[] = [];
    const findings = await diagnoseStatusline({ projectRoot: root, userHome: home, runner: runnerNotIgnoring([REAL_LOCAL], checked) });
    expect(findings.map((finding) => [finding.code, finding.path, finding.remediation])).toEqual([['STATUSLINE_LOCAL_TRACKED', REAL_LOCAL, `Add ${REAL_LOCAL} to .gitignore.`]]);
    expect(checked).toEqual([LINK_LOCAL, REAL_LOCAL]);
  });

  it('reports nothing when both the link path and the real target are ignored', async (ctx) => {
    await requireLink(ctx, await attemptLink(join(root, '.agents'), join(root, '.claude')), join(root, '.claude'));
    expect(await diagnose([])).toEqual([]);
  });

  it('checks only the local path when .claude is a plain directory', async () => {
    await write(LINK_LOCAL, {});
    const checked: string[] = [];
    await diagnose([], checked);
    expect(checked).toEqual([LINK_LOCAL]);
  });
});
