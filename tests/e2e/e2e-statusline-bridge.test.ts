import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runStatuslinePipeline } from '../helpers/built-hook.js';
import { runBuiltCli } from './cli-runner.js';

const LOCAL = '.claude/settings.local.json';
const BRIDGE = '.claude/hooks/context-brake-statusline.mjs';
const STATE = '.context-brake/runtime/claude-statusline.json';
const LOCAL_BEFORE = '{\n  "permissions": {\n    "allow": []\n  }\n}\n';
const FLOW_TIMEOUT_MILLISECONDS = 120_000;

let base = '';
let root = '';
let env: Record<string, string> = {};

async function exists(path: string): Promise<boolean> {
  return stat(join(root, path)).then(() => true, () => false);
}

beforeEach(async () => {
  base = await realpath(await mkdtemp(join(tmpdir(), 'cb-e2e-statusline-')));
  root = join(base, 'Meus Projetos', 'ação');
  const home = join(base, 'home');
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(home, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude', 'settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(root, LOCAL), LOCAL_BEFORE, 'utf8');
  await writeFile(join(home, '.claude', 'settings.json'), '{ "statusLine": { "type": "command", "command": "user-statusline.sh" } }\n', 'utf8');
  env = { HOME: home, USERPROFILE: home };
});
afterEach(async () => { await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('E2E status line bridge on a path with spaces and accents (NFR-06, TC-21)', () => {
  it('installs, records a window, reports it in doctor, and restores the local file on remove', async () => {
    const init = await runBuiltCli(['init', '--yes', '--json', '--statusline-bridge'], root, env);
    expect(init.code).toBe(0);
    const local = JSON.parse(await readFile(join(root, LOCAL), 'utf8')) as { statusLine: { command: string } };
    expect(local.statusLine.command).toBe(`node "${root.replace(/\\/g, '/')}/${BRIDGE}" --pipe | ( user-statusline.sh\n)`);
    const payload = await readFile(resolve('tests/fixtures/harnesses/claude-code/statusline.json'), 'utf8');
    expect((await runStatuslinePipeline(join(root, BRIDGE), { bridgeArgs: [], previousArgs: null, stdin: payload })).bridgeCode).toBe(0);
    const doctor = await runBuiltCli(['doctor', '--json', '--harness', 'claude-code'], root, env);
    expect((JSON.parse(doctor.stdout) as { contextWindow: unknown }).contextWindow).toEqual({ bridge: 'installed', source: 'statusline', lastWindowTokens: 200000 });
    expect((await runBuiltCli(['remove', '--yes', '--json'], root, env)).code).toBe(0);
    expect(await readFile(join(root, LOCAL), 'utf8')).toBe(LOCAL_BEFORE);
    expect(await exists(STATE)).toBe(false);
    expect(await exists(BRIDGE)).toBe(false);
  }, FLOW_TIMEOUT_MILLISECONDS);
});
