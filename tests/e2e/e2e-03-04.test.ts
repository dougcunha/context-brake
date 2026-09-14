import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

describe('E2E-03: No project harness exits with warning (CA-03)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-03-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('exits with warning when no harness detected', async () => {
    await writeFile(join(tempDir, 'AGENTS.md'), '# Shared Agents\n', 'utf8');
    const result = await runBuiltCli(['init', '--yes'], tempDir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('NO_PROJECT_HARNESS');
    expect(result.stdout).toContain('--harness <id>');
    const configExists = await stat(join(tempDir, 'context-brake.config.json')).then(() => true).catch(() => false);
    expect(configExists).toBe(false);
  });
});

describe('E2E-04: Three consecutive installations are byte-idempotent (CA-05)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-04-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('preserves byte idempotency over 3 runs', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    const run1 = await runBuiltCli(['init', '--yes'], tempDir);
    expect(run1.code).toBe(0);
    const s1 = await readFile(join(tempDir, '.claude/settings.json'), 'utf8');
    const c1 = await readFile(join(tempDir, 'context-brake.config.json'), 'utf8');
    const run2 = await runBuiltCli(['init', '--yes'], tempDir);
    expect(run2.code).toBe(0);
    const s2 = await readFile(join(tempDir, '.claude/settings.json'), 'utf8');
    const c2 = await readFile(join(tempDir, 'context-brake.config.json'), 'utf8');
    const run3 = await runBuiltCli(['init', '--yes'], tempDir);
    expect(run3.code).toBe(0);
    const s3 = await readFile(join(tempDir, '.claude/settings.json'), 'utf8');
    const c3 = await readFile(join(tempDir, 'context-brake.config.json'), 'utf8');
    expect(s2).toBe(s1);
    expect(s3).toBe(s1);
    expect(c2).toBe(c1);
    expect(c3).toBe(c1);
  });
});
