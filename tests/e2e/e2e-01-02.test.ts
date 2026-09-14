import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

describe('E2E-01: Claude installation (CA-01)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-01-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('installs Claude non-interactively', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    const result = await runBuiltCli(['init', '--yes'], tempDir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('claude-code');
    expect(result.stdout).toContain('full support');
    const configStat = await stat(join(tempDir, 'context-brake.config.json'));
    expect(configStat.isFile()).toBe(true);
    const hookStat = await stat(join(tempDir, '.claude/hooks/context-brake.mjs'));
    expect(hookStat.isFile()).toBe(true);
    const settings = JSON.parse(await readFile(join(tempDir, '.claude/settings.json'), 'utf8'));
    expect(settings.hooks.PreToolUse).toBeDefined();
  });
});

describe('E2E-02: Multi-harness detection (CA-02)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-02-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('installs two detected harnesses', async () => {
    await mkdir(join(tempDir, '.codex'), { recursive: true });
    await mkdir(join(tempDir, '.cursor'), { recursive: true });
    await writeFile(join(tempDir, '.codex/hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await writeFile(join(tempDir, '.cursor/hooks.json'), '{\n  "version": 1\n}\n', 'utf8');
    const result = await runBuiltCli(['init', '--yes'], tempDir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('codex-cli');
    expect(result.stdout).toContain('cursor');
    const config = JSON.parse(await readFile(join(tempDir, 'context-brake.config.json'), 'utf8'));
    expect(config.activeHarnesses).toContain('codex-cli');
    expect(config.activeHarnesses).toContain('cursor');
  });
});
