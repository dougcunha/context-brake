import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileSnapshot, PlannedChange } from '../../src/core/contracts/changes.js';
import { GITIGNORE_PATH, planGitIgnoreForInstall, runtimeStatePaths } from '../../src/core/services/gitignore-plan.js';

const ROOT = resolve('/project');
const STATE = '.context-brake/runtime/claude-mod-install.json';
const BRIDGE = '.context-brake/runtime/claude-statusline.json';
const SETTINGS = '.claude/settings.local.json';
const HOOK = '.claude/hooks/context-brake.mjs';

function existingAt(path: string, realPath: string = join(ROOT, path)): FileSnapshot {
  return { path, realPath, exists: true, content: '{}', sha256: null, isSymlink: false, fileIdentity: '' };
}

function plannedAt(path: string, kind: PlannedChange['kind']): PlannedChange {
  return { path, realPath: join(ROOT, path), kind, owner: 'harness_entry', content: kind === 'delete' ? null : '{}', preview: { summary: path } };
}

describe('runtimeStatePaths lists the state files init writes under the runtime folder (prd-17 FR-01, CR-02, TC-02)', () => {
  it('adds planned and existing runtime files and nothing outside the runtime folder (FR-01, CR-02, TC-02)', () => {
    const paths = runtimeStatePaths([plannedAt(STATE, 'create'), plannedAt(SETTINGS, 'update')], [existingAt(BRIDGE), existingAt(SETTINGS)]);
    expect(paths.sort()).toEqual([STATE, BRIDGE]);
  });
  it('drops a runtime file that the plan deletes, planned or existing (FR-02, CR-02, TC-02)', () => {
    expect(runtimeStatePaths([plannedAt(STATE, 'delete')], [existingAt(STATE)])).toEqual([]);
  });
});

describe('planGitIgnoreForInstall locates each owned file through the plan (prd-17 FR-01, FR-03, CR-02, TC-02)', () => {
  it('lists the owned files, the targets of planned and existing links, and the runtime state files (FR-01, FR-03, CR-02, TC-02, BUG-01)', () => {
    const hook = { ...plannedAt(HOOK, 'create'), realPath: join(ROOT, '.agents/hooks/context-brake.mjs') };
    const absent = { ...existingAt(GITIGNORE_PATH), exists: false, content: null };
    const snapshots = [existingAt(SETTINGS), existingAt('context-brake.config.json', join(ROOT, 'shared/context-brake.config.json')), absent];
    const plan = planGitIgnoreForInstall({ root: ROOT, enabled: true, insideGit: true, hasInstall: true, assetPaths: [HOOK], changes: [hook, plannedAt(STATE, 'create')], snapshots });
    expect(plan.paths).toEqual(['.agents/hooks/context-brake.mjs', HOOK, '.context-brake/manifest.json', STATE, 'context-brake.config.json', 'shared/context-brake.config.json']);
    expect(plan.change).toMatchObject({ kind: 'create', realPath: join(ROOT, GITIGNORE_PATH) });
  });
});
