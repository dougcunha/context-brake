import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { bridgeCommand, toCommandRoot } from '../../src/infrastructure/harnesses/claude-code/statusline-settings.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { findPosixShell, runInShell } from '../helpers/posix-shell.js';
import { fixedClock } from '../helpers/runtime-seed.js';
import { runBuiltCli } from './cli-runner.js';

const LOCAL = '.claude/settings.local.json';
const FIXTURE_SESSION: SessionKey = { harness: 'claude-code', sessionId: 'abc123', agentId: null };
const QUOTED_PREVIOUS = `node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write('model='+JSON.parse(s).model.id))"`;
const COMMENTED_PREVIOUS = `node -e "process.stdout.write('ok')" # note`;
const FAILING_PREVIOUS = `node -e "process.stdout.write('partial');process.exit(3)"`;
const FLOW_TIMEOUT_MILLISECONDS = 120_000;
const shell = findPosixShell();

let base = '';
let root = '';
let payload = '';

async function expectSameAsPrevious(previous: string): Promise<void> {
  const alone = await runInShell(shell!, previous, payload);
  const bridged = await runInShell(shell!, bridgeCommand(toCommandRoot(root), previous)!, payload);
  expect(bridged.stdout.equals(alone.stdout)).toBe(true);
  expect(bridged.code).toBe(alone.code);
}

beforeAll(async () => {
  if (shell === null) return;
  base = await realpath(await mkdtemp(join(tmpdir(), 'cb-e2e-statusline-shell-')));
  root = join(base, 'Meus Projetos', 'ação');
  const home = join(base, 'home');
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(home, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude', 'settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(home, '.claude', 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: QUOTED_PREVIOUS } }), 'utf8');
  payload = await readFile(resolve('tests/fixtures/harnesses/claude-code/statusline.json'), 'utf8');
  expect((await runBuiltCli(['init', '--yes', '--json', '--statusline-bridge'], root, { HOME: home, USERPROFILE: home })).code).toBe(0);
}, FLOW_TIMEOUT_MILLISECONDS);
afterAll(async () => { if (base !== '') await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('installed status line command through a POSIX shell (NFR-06, DEC-02, TC-11, codereview_01/CR-03, CR-05)', () => {
  it('runs the command written by init, with quotes, on a root with spaces and accents', async (ctx) => {
    if (shell === null) return process.env.CI === undefined ? ctx.skip('no POSIX shell (sh) found on this machine') : expect.fail('CI requires a POSIX shell');
    const local = JSON.parse(await readFile(join(root, LOCAL), 'utf8')) as { statusLine: { command: string } };
    const bridged = await runInShell(shell, local.statusLine.command, payload);
    expect(bridged.stdout.toString()).toBe('model=claude-opus-5-5');
    expect(bridged.code).toBe(0);
    const lines = await new NodeSessionLedger(root, fixedClock).readLines(FIXTURE_SESSION);
    expect(lines.some((line) => line.type === 'statusline')).toBe(true);
  }, FLOW_TIMEOUT_MILLISECONDS);

  it('keeps a previous command that ends in a comment', async (ctx) => {
    if (shell === null) return ctx.skip('no POSIX shell (sh) found on this machine');
    await expectSameAsPrevious(COMMENTED_PREVIOUS);
  });

  it('keeps the exit code and partial output of a failing previous command', async (ctx) => {
    if (shell === null) return ctx.skip('no POSIX shell (sh) found on this machine');
    await expectSameAsPrevious(FAILING_PREVIOUS);
  });

  it('prints nothing and exits 0 without a previous command', async (ctx) => {
    if (shell === null) return ctx.skip('no POSIX shell (sh) found on this machine');
    const bridged = await runInShell(shell, bridgeCommand(toCommandRoot(root), null)!, payload);
    expect(bridged.stdout.length).toBe(0);
    expect(bridged.code).toBe(0);
  });
});
