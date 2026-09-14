import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import type { InstallationManifest } from '../../src/core/contracts/manifest.js';
import { planRemoval } from '../../src/core/services/removal-service.js';
import { CURRENT_START_MARKER, CURRENT_END_MARKER } from '../../src/core/services/instruction-markers.js';

const dummyContext = { projectRoot: '/test-repo' };
const protocolSnap: FileSnapshot = { path: 'docs/protocol.md', realPath: '/test-repo/docs/protocol.md', exists: true, content: 'protocol', sha256: 'proto-hash', isSymlink: false, fileIdentity: 'proto' };
const planSnap: FileSnapshot = { path: 'task_plan.json', realPath: '/test-repo/task_plan.json', exists: true, content: '{}', sha256: 'plan-hash', isSymlink: false, fileIdentity: 'plan' };
const checkpointSnap: FileSnapshot = { path: 'state_checkpoint.json', realPath: '/test-repo/state_checkpoint.json', exists: true, content: '{}', sha256: 'chk-hash', isSymlink: false, fileIdentity: 'chk' };
const instContent = `# Instructions\n\n${CURRENT_START_MARKER}\nWhen task_plan.json exists follow docs/protocol.md.\n${CURRENT_END_MARKER}\n\n# User Section\nKeep this.`;
const instSnap: FileSnapshot = { path: 'CLAUDE.md', realPath: '/test-repo/CLAUDE.md', exists: true, content: instContent, sha256: 'inst-hash', isSymlink: false, fileIdentity: 'inst' };

describe('UT-11: Default removal targets exact owned content (CA-12)', () => {
  it('removes exact owned content and retains plan/checkpoint by default', async () => {
    const manifest: InstallationManifest = {
      schemaVersion: 1, packageVersion: '1.0.0',
      assets: [{ path: '.claude/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: 'valid-hash' }],
      entries: [{ harness: 'claude-code', path: '.claude/settings.json', identity: 'hook-id' }],
    };
    const hookSnap: FileSnapshot = { path: '.claude/hooks/context-brake.mjs', realPath: '/test-repo/.claude/hooks/context-brake.mjs', exists: true, content: 'code', sha256: 'valid-hash', isSymlink: false, fileIdentity: 'hook' };
    const allSnaps = [protocolSnap, planSnap, checkpointSnap, instSnap, hookSnap];
    const result = await planRemoval({
      projectRoot: '/test-repo', config: null, adapters: [], context: dummyContext,
      instructionSnapshots: [instSnap], protocolSnapshot: protocolSnap, allSnapshots: allSnaps,
      manifest, removeState: false, planSnapshot: planSnap, checkpointSnapshot: checkpointSnap,
    });
    const deletedPaths = result.plan.changes.filter((c) => c.kind === 'delete').map((c) => c.path);
    expect(deletedPaths).toContain('.claude/hooks/context-brake.mjs');
    expect(deletedPaths).not.toContain('task_plan.json');
    expect(deletedPaths).not.toContain('state_checkpoint.json');
    const instChange = result.plan.changes.find((c) => c.path === 'CLAUDE.md')!;
    expect(instChange.content).not.toContain(CURRENT_START_MARKER);
    expect(instChange.content).toContain('# User Section');
  });
});

describe('UT-11: Modified assets and explicit state removal (CA-12)', () => {
  it('preserves modified assets with conflict and deletes state only with removeState: true', async () => {
    const manifest: InstallationManifest = {
      schemaVersion: 1, packageVersion: '1.0.0',
      assets: [{ path: '.claude/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: 'original-hash' }],
      entries: [],
    };
    const modifiedHookSnap: FileSnapshot = { path: '.claude/hooks/context-brake.mjs', realPath: '/test-repo/.claude/hooks/context-brake.mjs', exists: true, content: 'user modified', sha256: 'modified-hash', isSymlink: false, fileIdentity: 'hook' };
    const allSnaps = [protocolSnap, planSnap, checkpointSnap, instSnap, modifiedHookSnap];
    const result = await planRemoval({
      projectRoot: '/test-repo', config: null, adapters: [], context: dummyContext,
      instructionSnapshots: [instSnap], protocolSnapshot: protocolSnap, allSnapshots: allSnaps,
      manifest, removeState: true, planSnapshot: planSnap, checkpointSnapshot: checkpointSnap,
    });
    expect(result.plan.conflicts.some((c) => c.code === 'MODIFIED_OWNED_ASSET')).toBe(true);
    const deletedPaths = result.plan.changes.filter((c) => c.kind === 'delete').map((c) => c.path);
    expect(deletedPaths).not.toContain('.claude/hooks/context-brake.mjs');
    expect(deletedPaths).toContain('task_plan.json');
    expect(deletedPaths).toContain('state_checkpoint.json');
  });
});
