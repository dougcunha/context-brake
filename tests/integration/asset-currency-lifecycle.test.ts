import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const INIT_ARGS = ['init', '--yes', '--harness', 'claude-code', '--harness', 'cursor'];
const CLAUDE_HOOK = '.claude/hooks/context-brake.mjs';
const CURSOR_HOOK = '.cursor/hooks/context-brake.mjs';
const STALE_CONTENT = '// stale hook from an older ContextBrake package';
const MODIFIED_CONTENT = '// hand-edited by the user, do not overwrite';

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function makeClaudeHookOutdated(root: string): Promise<void> {
  await writeFile(join(root, CLAUDE_HOOK), STALE_CONTENT, 'utf8');
  const manifestPath = join(root, '.context-brake/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { assets: { path: string; sha256: string }[] };
  const assets = manifest.assets.map((asset) => (asset.path === CLAUDE_HOOK ? { ...asset, sha256: sha256(STALE_CONTENT) } : asset));
  await writeFile(manifestPath, JSON.stringify({ ...manifest, assets }, null, 2), 'utf8');
}

describe('E2E asset currency (FR-08, TC-04)', () => {
  it('rewrites an outdated asset and leaves a modified one untouched with MODIFIED_OWNED_ASSET', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-e2e-asset-'));
    try {
      await mkdir(join(dir, '.claude'), { recursive: true });
      await mkdir(join(dir, '.cursor'), { recursive: true });
      expect((await runInProcessCli(INIT_ARGS, dir)).code).toBe(0);
      const installedClaudeHook = await readFile(join(dir, CLAUDE_HOOK), 'utf8');
      await makeClaudeHookOutdated(dir);
      await writeFile(join(dir, CURSOR_HOOK), MODIFIED_CONTENT, 'utf8');
      const report = installReportSchema.parse(JSON.parse((await runInProcessCli([...INIT_ARGS, '--json'], dir)).stdout));
      expect(report.plan.conflicts).toContainEqual(expect.objectContaining({ code: 'MODIFIED_OWNED_ASSET', path: CURSOR_HOOK }));
      expect(await readFile(join(dir, CLAUDE_HOOK), 'utf8')).toBe(installedClaudeHook);
      expect(await readFile(join(dir, CURSOR_HOOK), 'utf8')).toBe(MODIFIED_CONTENT);
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
