import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import type { InstallationManifest } from '../../src/core/contracts/manifest.js';
import { planRemoval } from '../../src/core/services/removal-service.js';

const HOOK_PATH = '.claude/hooks/context-brake.mjs';
const MANIFEST_PATH = '.context-brake/manifest.json';
const CONFIG_PATH = 'context-brake.config.json';
const RUNTIME_PATHS = ['.context-brake/runtime/lock.json', '.context-brake/runtime/sessions/s1.json'];
function snap(path: string, content: string, sha256 = `${path}-hash`): FileSnapshot {
  return { path, realPath: `/test-repo/${path}`, exists: true, content, sha256, isSymlink: false, fileIdentity: path };
}
const userFiles = [
  snap('docs/context-brake-protocol.md', '# Protocol'),
  snap('task_plan.json', '{}'),
  snap('CLAUDE.md', '# Instructions\n\n<!-- CONTEXTBRAKE:START -->\nlegacy\n<!-- CONTEXTBRAKE:END -->\n'),
  snap('.gitignore', '# CONTEXTBRAKE:START\n/task_plan.json\n# CONTEXTBRAKE:END\n'),
];
const runtimeFiles = RUNTIME_PATHS.map((path) => snap(path, '{}'));
function manifestWith(sha256: string): InstallationManifest {
  return { schemaVersion: 1, packageVersion: '1.0.0', assets: [{ path: HOOK_PATH, kind: 'runtime_asset', sha256 }], entries: [] };
}
async function plan(hookSha: string) {
  const hook = snap(HOOK_PATH, 'code', hookSha);
  return planRemoval({
    projectRoot: '/test-repo', config: null, adapters: [], context: { projectRoot: '/test-repo' },
    allSnapshots: [...userFiles, hook, snap(MANIFEST_PATH, '{}'), snap(CONFIG_PATH, '{}'), ...runtimeFiles], manifest: manifestWith('valid-hash'), runtimeStateSnapshots: runtimeFiles,
  });
}

describe('removal plan without support files (FR-08, DEC-04, TC-12)', () => {
  it('deletes only the owned asset, runtime files, manifest, and configuration, never the protocol, instruction, gitignore, or plan files', async () => {
    const result = await plan('valid-hash');
    expect(result.plan.changes.map((change) => [change.path, change.kind, change.owner])).toEqual([
      [HOOK_PATH, 'delete', 'runtime_asset'],
      [MANIFEST_PATH, 'delete', 'manifest'],
      ...RUNTIME_PATHS.map((path) => [path, 'delete', 'runtime_state']),
      [CONFIG_PATH, 'delete', 'config'],
    ]);
    expect([result.plan.conflicts, result.findings]).toEqual([[], []]);
  });
  it('keeps a modified asset, the manifest, and the configuration, and reports the conflict as a finding', async () => {
    const result = await plan('modified-hash');
    expect(result.plan.changes.map((change) => change.path)).toEqual(RUNTIME_PATHS);
    expect(result.plan.conflicts).toEqual([expect.objectContaining({ path: HOOK_PATH, code: 'MODIFIED_OWNED_ASSET' })]);
    expect(result.findings).toEqual([expect.objectContaining({ code: 'MODIFIED_OWNED_ASSET', harness: null, path: HOOK_PATH, impact: 'This file could not be removed.' })]);
  });
});
