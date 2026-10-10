import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const HARNESS_FILES = [['codex-cli', '.codex/hooks.json'], ['cursor', '.cursor/hooks.json']] as const;
const CODEX_USER_HOOK = '"command": "echo \'user patch hook\'"';
const CURSOR_USER_HOOK = '"command": "echo \'user pre-tool hook\'"';

async function seedUserHooks(root: string): Promise<void> {
  for (const [harness, path] of HARNESS_FILES) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await copyFile(join('tests/fixtures/harnesses', harness, 'user-hooks.json'), join(root, path));
  }
}

async function readHarnessFiles(root: string): Promise<string[]> {
  return Promise.all(HARNESS_FILES.map(([, path]) => readFile(join(root, path), 'utf8')));
}

describe('E2E-02: Multi-harness detection and install (CA-02, IT-02)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-02-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('installs Codex and Cursor together, keeps their user hooks, and changes no byte on a second run', async () => {
    await seedUserHooks(tempDir);
    expect((await runInProcessCli(['init', '--yes'], tempDir)).code).toBe(0);
    const config = JSON.parse(await readFile(join(tempDir, 'context-brake.config.json'), 'utf8')) as { activeHarnesses: string[] };
    expect([...config.activeHarnesses].sort()).toEqual(['codex-cli', 'cursor']);
    const installed = await readHarnessFiles(tempDir);
    expect(installed[0]).toContain(CODEX_USER_HOOK);
    expect(installed[1]).toContain(CURSOR_USER_HOOK);
    expect((await runInProcessCli(['init', '--yes'], tempDir)).code).toBe(0);
    expect(await readHarnessFiles(tempDir)).toEqual(installed);
  });
});
