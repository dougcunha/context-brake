import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import type { InstallationManifest } from '../../src/core/contracts/manifest.js';
import { planRemoval } from '../../src/core/services/removal-service.js';

const dummyContext = { projectRoot: '/test-repo' };
function snap(path: string, content: string, sha256 = `${path}-hash`): FileSnapshot {
  return { path, realPath: `/test-repo/${path}`, exists: true, content, sha256, isSymlink: false, fileIdentity: path };
}
const userFiles = [
  snap('docs/context-brake-protocol.md', '# Protocol'),
  snap('task_plan.json', '{}'),
  snap('CLAUDE.md', '# Instructions\n\n<!-- CONTEXTBRAKE:START -->\nlegacy\n<!-- CONTEXTBRAKE:END -->\n'),
  snap('.gitignore', '# CONTEXTBRAKE:START\n/task_plan.json\n# CONTEXTBRAKE:END\n'),
];
const runtimeFiles = [snap('.context-brake/runtime/sessions/s1.json', '{}'), snap('.context-brake/runtime/lock.json', '{}')];
function manifestWith(sha256: string): InstallationManifest {
  return { schemaVersion: 1, packageVersion: '1.0.0', assets: [{ path: '.claude/hooks/context-brake.mjs', kind: 'runtime_asset', sha256 }], entries: [] };
}
async function plan(hookSha: string) {
  const hook = snap('.claude/hooks/context-brake.mjs', 'code', hookSha);
  return planRemoval({
    projectRoot: '/test-repo', config: null, adapters: [], context: dummyContext,
    allSnapshots: [...userFiles, hook, ...runtimeFiles], manifest: manifestWith('valid-hash'), runtimeStateSnapshots: runtimeFiles,
  });
}

describe('removal plan without support files (FR-08, DEC-04, TC-12)', () => {
  it('deletes the owned asset and runtime files and never touches the protocol, instruction, gitignore, or plan files', async () => {
    const result = await plan('valid-hash');
    const changed = result.plan.changes.map((change) => change.path);
    expect(changed).toEqual(expect.arrayContaining(['.claude/hooks/context-brake.mjs', ...runtimeFiles.map((file) => file.path)]));
    expect(changed).not.toEqual(expect.arrayContaining([expect.stringMatching(/protocol|CLAUDE\.md|\.gitignore|task_plan/)]));
  });
  it('marks every runtime file as an owned runtime-state deletion', async () => {
    const result = await plan('valid-hash');
    const runtime = result.plan.changes.filter((change) => change.path.startsWith('.context-brake/runtime/'));
    expect(runtime.map((change) => [change.kind, change.owner])).toEqual([['delete', 'runtime_state'], ['delete', 'runtime_state']]);
  });
  it('keeps a modified asset and reports a conflict', async () => {
    const result = await plan('modified-hash');
    expect(result.plan.conflicts.some((conflict) => conflict.code === 'MODIFIED_OWNED_ASSET')).toBe(true);
    expect(result.plan.changes.map((change) => change.path)).not.toContain('.claude/hooks/context-brake.mjs');
  });
});
