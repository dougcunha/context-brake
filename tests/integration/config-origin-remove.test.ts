import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const HARNESS_DIRS = ['.claude', '.codex', '.cursor'] as const;
const CONFIGS = ['.claude/settings.json', '.codex/hooks.json', '.cursor/hooks.json'] as const;
const USER_CONFIGS: Record<string, string> = {
  '.claude/settings.json': '{\n  "model": "opus"\n}\n',
  '.codex/hooks.json': '{"hooks":{}}',
  '.cursor/hooks.json': '{\n  "version": 1\n}\n',
};
const MANIFEST = '.context-brake/manifest.json';
let root = '';

async function run(args: readonly string[]): Promise<void> {
  const result = await runInProcessCli(args, root);
  expect(result.code).toBe(0);
}
async function seed(files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content, 'utf8');
  }
}
async function readOrNull(path: string): Promise<string | null> {
  return readFile(join(root, path), 'utf8').catch(() => null);
}
async function createHarnessDirs(): Promise<void> {
  await Promise.all(HARNESS_DIRS.map((dir) => mkdir(join(root, dir), { recursive: true })));
}

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-config-origin-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });


describe('remove gives back the harness config files init created (RF6, CA-05, RF19)', () => {
  it('deletes the config files init created, after a second init', async () => {
    await createHarnessDirs();
    await run(['init', '--yes']);
    expect(await Promise.all(CONFIGS.map(readOrNull))).not.toContain(null);
    await run(['init', '--yes']);
    await run(['remove', '--yes']);
    expect(await Promise.all(CONFIGS.map(readOrNull))).toEqual([null, null, null]);
  });

  it('keeps a created config file with the keys the user added after init', async () => {
    await mkdir(join(root, '.cursor'), { recursive: true });
    await run(['init', '--yes']);
    const installed = (await readOrNull('.cursor/hooks.json'))!;
    await writeFile(join(root, '.cursor/hooks.json'), installed.replace('{\n', '{\n  "user": true,\n'), 'utf8');
    await run(['remove', '--yes']);
    expect(await readOrNull('.cursor/hooks.json')).toBe('{\n  "user": true\n}\n');
  });
});

describe('remove gives back the user config files init extended (RF6, CA-05, RF19)', () => {
  it('removes only the keys init added, after a second init', async () => {
    await seed(USER_CONFIGS);
    await run(['init', '--yes']);
    await run(['init', '--yes']);
    await run(['remove', '--yes']);
    expect(await Promise.all(Object.keys(USER_CONFIGS).map(readOrNull))).toEqual(Object.values(USER_CONFIGS));
  });

  it('keeps the hooks key for an install recorded before config origins existed', async () => {
    await mkdir(join(root, '.cursor'), { recursive: true });
    await run(['init', '--yes']);
    const manifest = JSON.parse((await readOrNull(MANIFEST))!) as Record<string, unknown>;
    delete manifest['configOrigins'];
    await writeFile(join(root, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await run(['remove', '--yes']);
    expect(await readOrNull('.cursor/hooks.json')).toBe('{\n  "version": 1,\n  "hooks": {}\n}\n');
  });
});