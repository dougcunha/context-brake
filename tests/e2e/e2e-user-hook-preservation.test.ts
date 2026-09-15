import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

async function checkHooks(file: string, userText: string, cbCount: number): Promise<void> {
  const content = await readFile(file, 'utf8');
  expect(content).toContain(userText);
  expect(content.match(/context-brake\.mjs/g)?.length ?? 0).toBe(cbCount);
}

describe('E2E user hook preservation (RF6, CA-05, RF19, CA-12)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-e2e-user-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('preserves user hooks through three inits and remove', async () => {
    const codex = join(root, '.codex/hooks.json');
    const cursor = join(root, '.cursor/hooks.json');
    await mkdir(join(root, '.codex'), { recursive: true });
    await mkdir(join(root, '.cursor'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/codex-cli/user-hooks.json', codex);
    await copyFile('tests/fixtures/harnesses/cursor/user-hooks.json', cursor);

    expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);
    expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);
    expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);

    await checkHooks(codex, 'echo \'user patch hook\'', 6);
    await checkHooks(cursor, 'echo \'user pre-tool hook\'', 3);

    expect((await runBuiltCli(['remove', '--yes'], root)).code).toBe(0);
    await checkHooks(codex, 'echo \'user patch hook\'', 0);
    await checkHooks(cursor, 'echo \'user pre-tool hook\'', 0);
  });
});
