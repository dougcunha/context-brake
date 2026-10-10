import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { STATUSLINE_STATE_FILE } from '../../src/infrastructure/harnesses/claude-code/statusline-state.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { findStatuslineShells, runInShellCandidate, type ShellCandidate } from '../helpers/posix-shell.js';
import { fixedClock } from '../helpers/runtime-seed.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const LOCAL = '.claude/settings.local.json';
const FIXTURE_SESSION: SessionKey = { harness: 'claude-code', sessionId: 'abc123', agentId: null };
const QUOTED_PREVIOUS = `node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write('model='+JSON.parse(s).model.id))"`;
const ANSI_PREVIOUS = `node -e "process.stdout.write(String.fromCharCode(27)+'[32mone'+String.fromCharCode(27)+'[0m'+String.fromCharCode(10)+'two'+String.fromCharCode(10))"`;
const COMMENTED_PREVIOUS = `node -e "process.stdout.write('ok')" # note`;
const FAILING_PREVIOUS = `node -e "process.stdout.write('partial');process.exit(3)"`;
const FLOW_TIMEOUT_MILLISECONDS = 120_000;
const shells = findStatuslineShells();

let base = '';
let root = '';
let payload = '';
let installed = '';

async function usePrevious(command: string): Promise<void> {
  const statePath = join(root, STATUSLINE_STATE_FILE);
  const state = JSON.parse(await readFile(statePath, 'utf8')) as Record<string, unknown>;
  await writeFile(statePath, JSON.stringify({ ...state, previousCommand: command }), 'utf8');
}
async function latestShell(): Promise<unknown> {
  const lines = await new NodeSessionLedger(root, fixedClock).readLines(FIXTURE_SESSION);
  return lines.filter((line) => line.type === 'statusline').at(-1);
}
function requireShells(skip: (reason: string) => void): void {
  if (shells.length === 0 && process.env.CI !== undefined) expect.fail('CI requires a shell for the status line');
  if (shells.length === 0) skip('no status line shell found on this machine');
}

beforeAll(async () => {
  base = await realpath(await mkdtemp(join(tmpdir(), 'cb-e2e-statusline-shell-')));
  root = join(base, 'Meus Projetos', 'ação');
  const home = join(base, 'home');
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(home, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude', 'settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(home, '.claude', 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: QUOTED_PREVIOUS } }), 'utf8');
  payload = await readFile(resolve('tests/fixtures/harnesses/claude-code/statusline.json'), 'utf8');
  expect((await runInProcessCli(['init', '--yes', '--json', '--statusline-bridge'], root, { HOME: home, USERPROFILE: home })).code).toBe(0);
  installed = (JSON.parse(await readFile(join(root, LOCAL), 'utf8')) as { statusLine: { command: string } }).statusLine.command;
}, FLOW_TIMEOUT_MILLISECONDS);
afterAll(async () => { if (base !== '') await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('installed status line command in every shell (FR-01, FR-02, NFR-01, DEC-01, DEC-02, TC-02)', () => {
  it.each(shells.map((shell): [string, ShellCandidate] => [`${shell.label} (${shell.executable})`, shell]))('prints the previous status line unchanged through %s', async (_name, shell) => {
    for (const previous of [QUOTED_PREVIOUS, ANSI_PREVIOUS, COMMENTED_PREVIOUS]) {
      await usePrevious(previous);
      const alone = await runInShellCandidate(shell, previous, payload);
      const bridged = await runInShellCandidate(shell, installed, payload);
      expect(bridged.stdout.equals(alone.stdout)).toBe(true);
      expect(bridged.code).toBe(0);
    }
    expect(await latestShell()).toMatchObject({ type: 'statusline', shell: shell.label });
  }, FLOW_TIMEOUT_MILLISECONDS);
  it('prints one fallback line and exits 0 when the previous command fails (FR-03, TC-04)', async (ctx) => {
    requireShells((reason) => ctx.skip(reason));
    await usePrevious(FAILING_PREVIOUS);
    const bridged = await runInShellCandidate(shells[0]!, installed, payload);
    expect(bridged.stdout.toString()).toMatch(/^ContextBrake .*previous status line failed \(exit 3\) · run context-brake doctor\n$/);
    expect(bridged.code).toBe(0);
  }, FLOW_TIMEOUT_MILLISECONDS);
});
