import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInit } from '../../src/cli/commands/init.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';
import { buildHarnessContext, collectHarnessSources } from '../../src/cli/detection-collector.js';
import { collectProjectSnapshots } from '../../src/cli/snapshot-helper.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';
import { NodeManifestStore } from '../../src/infrastructure/storage/manifest-store.js';
import { readPackageVersion } from '../../src/infrastructure/storage/package-metadata.js';
import { ProjectConfigStore } from '../../src/infrastructure/storage/project-config-store.js';

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function setupInstalledRepo(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.cursor'), { recursive: true });
  await mkdir(join(root, '.github'), { recursive: true });
  const code = await runInit(
    { command: 'init', dryRun: false, yes: true, json: true, harness: ['claude-code', 'cursor', 'github-copilot-cli'], excludeHarness: [], instructionFile: [], createInstructions: false, migrateLegacy: false },
    { projectRoot: root },
  );
  expect(code).toBe(0);
}

async function corruptManifestAsset(root: string, path: string, shaValue: string): Promise<void> {
  const manifestPath = join(root, '.context-brake/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const asset = manifest.assets.find((a: { path: string }) => a.path === path);
  asset.sha256 = shaValue;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

async function runDoctorReport(root: string) {
  const config = await new ProjectConfigStore(join(root, 'context-brake.config.json')).read();
  const manifest = await new NodeManifestStore(root).load();
  const snapshots = await collectProjectSnapshots(root, config);
  const protocolSnapshot = snapshots.find((s) => s.path === config.instructionFiles.protocolFile)!;
  const gitignoreSnapshot = snapshots.find((s) => s.path === '.gitignore')!;
  const adapters = getAllAdapters();
  const context = buildHarnessContext({ projectRoot: root }, manifest);
  const sources = await collectHarnessSources(adapters, context);
  const packageVersion = await readPackageVersion();
  return diagnoseProject({
    projectRoot: root, config, adapters, context, sources,
    instructionSnapshots: snapshots.filter((s) => config.instructionFiles.targets.includes(s.path)),
    protocolSnapshot, gitignoreSnapshot, manifest, allSnapshots: snapshots, packageVersion,
  });
}

describe('doctor asset currency classification (FR-08, TC-03)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-asset-currency-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reports current, outdated, and modified assets across three harnesses', async () => {
    await setupInstalledRepo(tempDir);
    const cursorHookPath = join(tempDir, '.cursor/hooks/context-brake.mjs');
    const copilotHookPath = join(tempDir, '.github/hooks/context-brake.mjs');
    const staleContent = '// stale hook from an older ContextBrake package';
    await writeFile(cursorHookPath, staleContent, 'utf8');
    await corruptManifestAsset(tempDir, '.cursor/hooks/context-brake.mjs', sha256(staleContent));
    await writeFile(copilotHookPath, '// hand-edited by the user', 'utf8');
    const report = await runDoctorReport(tempDir);
    const outdated = report.findings.filter((f) => f.code === 'ASSET_OUTDATED');
    const modified = report.findings.filter((f) => f.code === 'ASSET_MODIFIED');
    expect(outdated).toHaveLength(1);
    expect(outdated[0]?.path).toBe('.cursor/hooks/context-brake.mjs');
    expect(outdated[0]?.remediation).toBe('Run context-brake init --yes.');
    expect(modified).toHaveLength(1);
    expect(modified[0]?.path).toBe('.github/hooks/context-brake.mjs');
    const claudeFindings = report.findings.filter((f) => f.harness === 'claude-code' && (f.code === 'ASSET_OUTDATED' || f.code === 'ASSET_MODIFIED'));
    expect(claudeFindings).toHaveLength(0);
  });
});
