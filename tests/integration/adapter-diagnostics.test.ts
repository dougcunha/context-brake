import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

const EMPTY_HOOKS = '{\n  "hooks": {}\n}\n';

let tempDir: string;

async function writeProjectFile(relativePath: string, content: string): Promise<void> {
  await mkdir(join(tempDir, relativePath, '..'), { recursive: true });
  await writeFile(join(tempDir, relativePath), content, 'utf8');
}

async function findingCodes(harness: HarnessId): Promise<string[]> {
  const adapter = getAllAdapters().find((candidate) => candidate.id === harness);
  const findings = await adapter!.diagnose({ projectRoot: tempDir });
  return findings.map((finding) => finding.code);
}

describe('adapter diagnostics (RF20, CA-14)', () => {
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-diag-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

  it('reports INTEGRATION_MISSING when configuration or hook asset is absent', async () => {
    for (const adapter of getAllAdapters()) {
      expect(await findingCodes(adapter.id)).toContain('INTEGRATION_MISSING');
    }
  });

  it.each([
    { harness: 'claude-code', file: '.claude/settings.json' },
    { harness: 'cursor', file: '.cursor/hooks.json' },
  ] as const)('reports INVALID_HARNESS_CONFIG when $file has malformed JSON', async ({ harness, file }) => {
    await writeProjectFile(file, '{ broken');
    expect(await findingCodes(harness)).toContain('INVALID_HARNESS_CONFIG');
  });

  it('reports MIXED_HOOK_REPRESENTATIONS for Codex when config.toml has [hooks]', async () => {
    await writeProjectFile('.codex/hooks.json', EMPTY_HOOKS);
    await writeProjectFile('.codex/config.toml', '[hooks]\npre_tool = "x"\n');
    expect(await findingCodes('codex-cli')).toContain('MIXED_HOOK_REPRESENTATIONS');
  });

  it('does not warn about the Codex git root when .git exists (CR-07)', async () => {
    await writeProjectFile('.codex/hooks.json', EMPTY_HOOKS);
    await writeProjectFile('.codex/hooks/context-brake.mjs', '');
    await mkdir(join(tempDir, '.git'));
    expect(await findingCodes('codex-cli')).not.toContain('CODEX_ROOT_NOT_GIT_TOPLEVEL');
  });
});
