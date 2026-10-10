import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupClaudeFixture, testSymlinkTarget, verifyClaudeInstalled } from '../helpers/cli-fixtures.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const INSTALLED_FILES = ['.claude/settings.json', 'context-brake.config.json', '.context-brake/manifest.json', '.claude/hooks/context-brake.mjs'];
const REPEATED_RUNS = 2;

async function readInstalled(root: string): Promise<string[]> {
  return Promise.all(INSTALLED_FILES.map((path) => readFile(join(root, path), 'utf8')));
}

async function packageVersion(): Promise<string> {
  return (JSON.parse(await readFile('package.json', 'utf8')) as { version: string }).version;
}

describe('init installs Claude Code idempotently and keeps symbolic links in process (CA-01, CA-05, CA-07, E2E-01, E2E-04, prd-13 DEC-03)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-init-idempotency-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('installs Claude Code with the running package version, keeps the user hook and CLAUDE.md, and changes no byte on two more runs (CA-01, CA-05, FR-07, TC-02)', async () => {
    await setupClaudeFixture(tempDir);
    const instructions = await readFile(join(tempDir, 'CLAUDE.md'), 'utf8');
    expect((await runInProcessCli(['init', '--yes'], tempDir)).code).toBe(0);
    await verifyClaudeInstalled(tempDir);
    const manifest = JSON.parse(await readFile(join(tempDir, '.context-brake/manifest.json'), 'utf8')) as { packageVersion: string };
    expect(manifest.packageVersion).toBe(await packageVersion());
    const installed = await readInstalled(tempDir);
    for (let run = 0; run < REPEATED_RUNS; run += 1) {
      expect((await runInProcessCli(['init', '--yes'], tempDir)).code).toBe(0);
      expect(await readInstalled(tempDir)).toEqual(installed);
    }
    expect(await readFile(join(tempDir, 'CLAUDE.md'), 'utf8')).toBe(instructions);
  });
  it('preserves a symbolic link target (CA-07)', (ctx) => testSymlinkTarget((args) => runInProcessCli(args, tempDir), tempDir, ctx));
});
