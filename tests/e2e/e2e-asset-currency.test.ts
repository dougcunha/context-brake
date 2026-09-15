import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function corruptManifestAsset(root: string, path: string, shaValue: string): Promise<void> {
  const manifestPath = join(root, '.context-brake/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const asset = manifest.assets.find((a: { path: string }) => a.path === path);
  asset.sha256 = shaValue;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

describe('E2E asset currency (FR-08, TC-04)', () => {
  it('rewrites an outdated asset and leaves a modified one untouched with MODIFIED_OWNED_ASSET', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-e2e-asset-'));
    try {
      await mkdir(join(dir, '.claude'), { recursive: true });
      await mkdir(join(dir, '.cursor'), { recursive: true });
      const first = await runBuiltCli(['init', '--yes', '--harness', 'claude-code', '--harness', 'cursor'], dir);
      expect(first.code).toBe(0);

      const claudeHookPath = join(dir, '.claude/hooks/context-brake.mjs');
      const cursorHookPath = join(dir, '.cursor/hooks/context-brake.mjs');
      const staleContent = '// stale hook from an older ContextBrake package';
      await writeFile(claudeHookPath, staleContent, 'utf8');
      await corruptManifestAsset(dir, '.claude/hooks/context-brake.mjs', sha256(staleContent));
      const modifiedContent = '// hand-edited by the user, do not overwrite';
      await writeFile(cursorHookPath, modifiedContent, 'utf8');

      const second = await runBuiltCli(['init', '--yes', '--harness', 'claude-code', '--harness', 'cursor', '--json'], dir);
      const report = JSON.parse(second.stdout);
      expect(report.plan.conflicts.some((c: { code: string; path: string }) => c.code === 'MODIFIED_OWNED_ASSET' && c.path === '.cursor/hooks/context-brake.mjs')).toBe(true);

      const claudeAfter = await readFile(claudeHookPath, 'utf8');
      expect(claudeAfter).not.toBe(staleContent);
      const cursorAfter = await readFile(cursorHookPath, 'utf8');
      expect(cursorAfter).toBe(modifiedContent);
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
