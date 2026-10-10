import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CURSOR_HOOK = '.cursor/hooks/context-brake.mjs';
const COPILOT_HOOK = '.github/hooks/context-brake.mjs';
const STALE_CONTENT = '// stale hook from an older ContextBrake package';
const HARNESS_FLAGS = ['--harness', 'claude-code', '--harness', 'cursor', '--harness', 'github-copilot-cli'];

async function setupInstalledRepo(root: string): Promise<void> {
  for (const dir of ['.claude', '.cursor', '.github']) await mkdir(join(root, dir), { recursive: true });
  expect((await runInProcessCli(['init', '--yes', '--json', ...HARNESS_FLAGS], root)).code).toBe(0);
}
async function recordStaleCursorHook(root: string): Promise<void> {
  const manifestPath = join(root, '.context-brake/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { assets: { path: string; sha256: string }[] };
  const asset = manifest.assets.find((entry) => entry.path === CURSOR_HOOK);
  if (asset) asset.sha256 = createHash('sha256').update(STALE_CONTENT).digest('hex');
  await writeFile(join(root, CURSOR_HOOK), STALE_CONTENT, 'utf8');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

describe('doctor asset currency classification (FR-08, TC-03)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-asset-currency-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reports current, outdated, and modified assets across three harnesses', async () => {
    await setupInstalledRepo(tempDir);
    await recordStaleCursorHook(tempDir);
    await writeFile(join(tempDir, COPILOT_HOOK), '// hand-edited by the user', 'utf8');
    const report = doctorReportSchema.parse(JSON.parse((await runInProcessCli(['doctor', '--json'], tempDir)).stdout));
    const assets = report.findings.filter((finding) => finding.code === 'ASSET_OUTDATED' || finding.code === 'ASSET_MODIFIED');
    expect(assets.map((finding) => [finding.code, finding.path])).toEqual([['ASSET_MODIFIED', COPILOT_HOOK], ['ASSET_OUTDATED', CURSOR_HOOK]]);
    expect(assets.find((finding) => finding.code === 'ASSET_OUTDATED')?.remediation).toBe('Run context-brake init --yes.');
  });
});
