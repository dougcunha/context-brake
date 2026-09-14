import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

describe('adapter diagnostics: missing and invalid configs (RF20, CA-14)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-diag-a-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reports INTEGRATION_MISSING when configuration or hook asset is absent', async () => {
    for (const adapter of getAllAdapters()) {
      const findings = await adapter.diagnose({ projectRoot: tempDir });
      expect(findings.some((f) => f.code === 'INTEGRATION_MISSING')).toBe(true);
    }
  });

  it('reports INVALID_HARNESS_CONFIG when configuration file has malformed JSON', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await mkdir(join(tempDir, '.cursor'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{ broken', 'utf8');
    await writeFile(join(tempDir, '.cursor/hooks.json'), '{ broken', 'utf8');
    const claude = getAllAdapters().find((a) => a.id === 'claude-code')!;
    const cursor = getAllAdapters().find((a) => a.id === 'cursor')!;
    const f1 = await claude.diagnose({ projectRoot: tempDir });
    const f2 = await cursor.diagnose({ projectRoot: tempDir });
    expect(f1.some((f) => f.code === 'INVALID_HARNESS_CONFIG')).toBe(true);
    expect(f2.some((f) => f.code === 'INVALID_HARNESS_CONFIG')).toBe(true);
  });
});

describe('adapter diagnostics: mixed representations (RF20)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-diag-b-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reports MIXED_HOOK_REPRESENTATIONS for Codex when config.toml has [hooks]', async () => {
    await mkdir(join(tempDir, '.codex'), { recursive: true });
    await writeFile(join(tempDir, '.codex/hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await writeFile(join(tempDir, '.codex/config.toml'), '[hooks]\npre_tool = "x"\n', 'utf8');
    const codex = getAllAdapters().find((a) => a.id === 'codex-cli')!;
    const findings = await codex.diagnose({ projectRoot: tempDir });
    expect(findings.some((f) => f.code === 'MIXED_HOOK_REPRESENTATIONS')).toBe(true);
  });
});
