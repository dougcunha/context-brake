import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

const CODEX_FIXTURE = 'tests/fixtures/harnesses/codex-cli/user-hooks-trailing.json';
const CURSOR_FIXTURE = 'tests/fixtures/harnesses/cursor/user-hooks-trailing.json';

async function runInit(root: string): Promise<void> {
  expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);
}

async function readAll(files: readonly string[]): Promise<string[]> {
  return Promise.all(files.map((file) => readFile(file, 'utf8')));
}

describe('E2E user hook preservation (RF6, CA-05, RF19, CA-12)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-e2e-user-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('preserves trailing comments through three inits and remove', async () => {
    const codex = join(root, '.codex/hooks.json');
    const cursor = join(root, '.cursor/hooks.json');
    const files = [codex, cursor];
    await mkdir(join(root, '.codex'), { recursive: true });
    await mkdir(join(root, '.cursor'), { recursive: true });
    await copyFile(CODEX_FIXTURE, codex);
    await copyFile(CURSOR_FIXTURE, cursor);
    const initial = await readAll(files);

    await runInit(root);
    const first = await readAll(files);
    expect(first[0]).toContain('context-brake.mjs');
    expect(first[0]).toContain('// keep PreToolUse');
    expect(first[0]).toContain('/* keep PostToolUse */');
    expect(first[1]).toContain('// keep preToolUse');

    await runInit(root);
    expect(await readAll(files)).toEqual(first);
    await runInit(root);
    expect(await readAll(files)).toEqual(first);

    expect((await runBuiltCli(['remove', '--yes'], root)).code).toBe(0);
    expect(await readAll(files)).toEqual(initial);
  });
});
