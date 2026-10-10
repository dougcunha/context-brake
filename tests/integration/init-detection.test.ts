import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';

describe('E2E-03: No project harness exits with warning (CA-03)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-03-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('exits with warning when no harness detected', async () => {
    await writeFile(join(tempDir, 'AGENTS.md'), '# Shared Agents\n', 'utf8');
    const result = await runInProcessCli(['init', '--yes'], tempDir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('NO_PROJECT_HARNESS');
    expect(result.stdout).toContain('--harness <id>');
    const configExists = await stat(join(tempDir, 'context-brake.config.json')).then(() => true).catch(() => false);
    expect(configExists).toBe(false);
  });
});
