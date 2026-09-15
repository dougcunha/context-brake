import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import type { InstallationManifest } from '../../src/core/contracts/manifest.js';
import { planRemoval } from '../../src/core/services/removal-service.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

const UNPARSABLE_CASES: Readonly<[HarnessId, string][]> = [
  ['claude-code', '.claude/settings.json'],
  ['codex-cli', '.codex/hooks.json'],
  ['cursor', '.cursor/hooks.json'],
  ['antigravity-cli', '.agents/hooks.json'],
];

function makeSnap(root: string, rel: string, sha = 'dummy'): FileSnapshot {
  return { path: rel, realPath: join(root, rel), exists: true, content: 'c', sha256: sha, isSymlink: false, fileIdentity: rel };
}

function assertRemovalFinding(findings: readonly DiagnosticFinding[]): void {
  const finding = findings.find((f) => f.code === 'INVALID_HARNESS_CONFIG');
  expect(finding).toBeDefined();
  expect(finding?.harness).toBe('codex-cli');
  expect(finding?.path).toBe('.codex/hooks.json');
  expect(finding?.impact).toBe('ContextBrake left this harness installed because its configuration could not be parsed.');
  expect(finding?.remediation).toBe('Fix or restore .codex/hooks.json, then run context-brake remove again.');
}

function createTestManifest(): InstallationManifest {
  return {
    schemaVersion: 1, packageVersion: '1.0.0',
    assets: [
      { path: '.codex/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: 'c-hash' },
      { path: '.cursor/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: 'cur-hash' },
    ],
    entries: [
      { harness: 'codex-cli', path: '.codex/hooks.json', identity: 'c-entry' },
      { harness: 'cursor', path: '.cursor/hooks.json', identity: 'cur-entry' },
    ],
  };
}

describe('planRemove with unparsable configuration (CR-06)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-conf-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

  it.each(UNPARSABLE_CASES)('isolates unparsable config for %s as conflict', async (harness, configPath) => {
    const fullConfig = join(tempDir, configPath);
    await mkdir(dirname(fullConfig), { recursive: true });
    await writeFile(fullConfig, '{\n  "broken": \n', 'utf8');
    const plan = await getAdapter(harness).planRemove({ projectRoot: tempDir });
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]?.code).toBe('INVALID_HARNESS_CONFIG');
    expect(plan.conflicts[0]?.path).toBe(configPath);
    expect(plan.changes).toHaveLength(0);
  });
});

describe('removal-service with conflicted harness (CR-06)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-conf-svc-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

  it('keeps manifest and config and skips conflicted runtime assets', async () => {
    await mkdir(join(tempDir, '.codex'), { recursive: true });
    await writeFile(join(tempDir, '.codex/hooks.json'), '{\n  "corrupt": \n', 'utf8');
    const allSnaps = [
      makeSnap(tempDir, '.codex/hooks/context-brake.mjs', 'c-hash'),
      makeSnap(tempDir, '.cursor/hooks/context-brake.mjs', 'cur-hash'),
      makeSnap(tempDir, 'docs/context-brake-protocol.md', 'p-hash'),
    ];
    const adapters = [getAdapter('codex-cli'), getAdapter('cursor')];
    const result = await planRemoval({
      projectRoot: tempDir, config: null, adapters, context: { projectRoot: tempDir },
      instructionSnapshots: [], protocolSnapshot: allSnaps[2]!, allSnapshots: allSnaps, manifest: createTestManifest(),
    });
    assertRemovalFinding(result.findings);
    const deleted = result.plan.changes.filter((c) => c.kind === 'delete').map((c) => c.path);
    expect(deleted).not.toContain('.codex/hooks/context-brake.mjs');
    expect(deleted).not.toContain('.context-brake/manifest.json');
    expect(deleted).not.toContain('context-brake.config.json');
    expect(deleted).toContain('.cursor/hooks/context-brake.mjs');
    expect(deleted).toContain('docs/context-brake-protocol.md');
  });
});
