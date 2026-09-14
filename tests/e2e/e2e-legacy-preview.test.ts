import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

const LEGACY = '# Title\n<!-- CONTEXTOPS:START -->\nKeep my note.\n## [PROTOCOL] Gestao Autonoma\n<!-- CONTEXTOPS:END -->\n# Tail\n';

async function setupRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-legacy-e2e-'));
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, '.claude/settings.json'), `${JSON.stringify({ hooks: { UserHook: 'node custom.js' } }, null, 2)}\n`, 'utf8');
  await writeFile(join(dir, 'AGENTS.md'), LEGACY, 'utf8');
  return dir;
}

async function cleanup(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

describe('E2E legacy preview (CR-02, RF14, CA-10)', () => {
  it('reports the proposed migration and leaves the file unchanged without the flag', async () => {
    const dir = await setupRepo();
    try {
      const dry = await runBuiltCli(['init', '--dry-run', '--json'], dir);
      expect(dry.code).toBe(1);
      expect(dry.stdout).toContain('LEGACY_BLOCK_DETECTED');
      expect(await readFile(join(dir, 'AGENTS.md'), 'utf8')).toBe(LEGACY);
      const applied = await runBuiltCli(['init', '--yes'], dir);
      expect(applied.code).toBe(1);
      expect(applied.stdout).toContain('--migrate-legacy');
      expect(await readFile(join(dir, 'AGENTS.md'), 'utf8')).toBe(LEGACY);
    } finally {
      await cleanup(dir);
    }
  });

  it('emits the legacy preview before a missing confirmation', async () => {
    const dir = await setupRepo();
    try {
      const res = await runBuiltCli(['init'], dir);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain('LEGACY_BLOCK_DETECTED');
      expect(await readFile(join(dir, 'AGENTS.md'), 'utf8')).toBe(LEGACY);
    } finally {
      await cleanup(dir);
    }
  });
});

describe('E2E legacy migration (CR-02, RF14, CA-10)', () => {
  it('migrates only with --migrate-legacy and preserves unmatched text', async () => {
    const dir = await setupRepo();
    try {
      const res = await runBuiltCli(['init', '--yes', '--migrate-legacy'], dir);
      expect(res.code).toBe(0);
      const content = await readFile(join(dir, 'AGENTS.md'), 'utf8');
      expect(content).toContain('<!-- CONTEXTBRAKE:START -->');
      expect(content).toContain('Keep my note.');
      expect(content).not.toContain('CONTEXTOPS:START');
      expect(content).not.toContain('Gestao Autonoma');
    } finally {
      await cleanup(dir);
    }
  });
});
