import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileSnapshot, PlannedChange } from '../../src/core/contracts/changes.js';
import { applyIgnoreBlock, BLOCK_END, BLOCK_START } from '../../src/core/services/gitignore-block.js';
import { GITIGNORE_PATH, MALFORMED_MARKERS_CODE, NO_GIT_CODE, ownedPathsFor, planGitIgnore, runtimeStatePaths } from '../../src/core/services/gitignore-plan.js';

const ROOT = resolve('/project');

function snapshot(content: string | null): FileSnapshot {
  return { path: GITIGNORE_PATH, realPath: join(ROOT, GITIGNORE_PATH), exists: content !== null, content, sha256: null, isSymlink: false, fileIdentity: '' };
}

function locateInRoot(path: string): string {
  return join(ROOT, path);
}

describe('ownedPathsFor lists the files ContextBrake owns (prd-17 FR-01, FR-03, TC-02)', () => {
  it('lists the configuration, the manifest, and the assets, sorted and without duplicates (FR-01, TC-02)', () => {
    const paths = ownedPathsFor(ROOT, ['.claude/hooks/context-brake.mjs', '.context-brake/manifest.json', 'context-brake.config.json'], locateInRoot);
    expect(paths).toEqual(['.claude/hooks/context-brake.mjs', '.context-brake/manifest.json', 'context-brake.config.json']);
  });
  it('names the link path and the target path when a harness folder is a link into the repository (FR-03, TC-02, BUG-01)', () => {
    const paths = ownedPathsFor(ROOT, ['.claude/hooks/context-brake.mjs'], (path) => (path.startsWith('.claude/') ? join(ROOT, '.agents', path.slice('.claude/'.length)) : locateInRoot(path)));
    expect(paths).toEqual(['.agents/hooks/context-brake.mjs', '.claude/hooks/context-brake.mjs', '.context-brake/manifest.json', 'context-brake.config.json']);
  });
  it('keeps the link path but skips a target outside the project (FR-03, TC-02, BUG-01)', () => {
    const outside = resolve(ROOT, '..', 'elsewhere', 'hook.mjs');
    const paths = ownedPathsFor(ROOT, ['.claude/hooks/hook.mjs'], (path) => (path.endsWith('hook.mjs') ? outside : locateInRoot(path)));
    expect(paths).toContain('.claude/hooks/hook.mjs');
    expect(paths).not.toContainEqual(expect.stringContaining('elsewhere'));
  });
});

describe('planGitIgnore plans one change on the root .gitignore (prd-17 FR-02, FR-04, FR-05, FR-07, TC-02)', () => {
  const PATHS = ['.context-brake/manifest.json', 'context-brake.config.json'];
  const input = { enabled: true, insideGit: true, paths: PATHS };

  it('creates the file with the block alone, anchoring every line (FR-01, FR-04, TC-02)', () => {
    const plan = planGitIgnore({ ...input, snapshot: snapshot(null) });
    expect(plan.change).toMatchObject({ path: '.gitignore', kind: 'create', owner: 'gitignore' });
    expect(plan.change?.content).toBe(`${BLOCK_START}\n/.context-brake/manifest.json\n/context-brake.config.json\n${BLOCK_END}\n`);
    expect(plan.paths).toEqual(PATHS);
  });
  it('plans nothing when the block is already current (FR-02, NFR-01, TC-02)', () => {
    const current = applyIgnoreBlock('dist/\n', PATHS.map((path) => `/${path}`));
    expect(planGitIgnore({ ...input, snapshot: snapshot('content' in current ? current.content : null) }).change).toBeNull();
  });
});

describe('planGitIgnore opt-out, escapes, conflicts, and no Git (prd-17 FR-04, FR-05, FR-07, TC-02)', () => {
  const PATHS = ['.context-brake/manifest.json', 'context-brake.config.json'];
  const input = { enabled: true, insideGit: true, paths: PATHS };

  it('removes the block and deletes a file that held only the block when disabled (FR-05, TC-02)', () => {
    const only = applyIgnoreBlock(null, ['/a']);
    const plan = planGitIgnore({ ...input, enabled: false, snapshot: snapshot('content' in only ? only.content : null) });
    expect(plan.change).toMatchObject({ kind: 'delete', content: null });
    expect(plan.paths).toEqual([]);
  });
  it('escapes characters Git treats specially (FR-01, TC-02)', () => {
    const plan = planGitIgnore({ ...input, paths: ['dir/[a]*?.mjs', 'dir/x '], snapshot: snapshot(null) });
    expect(plan.change?.content).toContain('/dir/\\[a]\\*\\?.mjs\n/dir/x\\ \n');
  });
  it('reports a conflict and no change for malformed markers (FR-04, TC-02)', () => {
    const plan = planGitIgnore({ ...input, snapshot: snapshot(`${BLOCK_START}\n/a\n`) });
    expect(plan.change).toBeNull();
    expect(plan.conflicts).toEqual([expect.objectContaining({ path: '.gitignore', code: MALFORMED_MARKERS_CODE })]);
  });
  it('writes nothing outside Git and says so only when the block is wanted (FR-07, TC-02)', () => {
    const wanted = planGitIgnore({ ...input, insideGit: false, snapshot: snapshot(null) });
    expect(wanted.change).toBeNull();
    expect(wanted.findings).toEqual([expect.objectContaining({ code: NO_GIT_CODE, severity: 'ok' })]);
    expect(planGitIgnore({ ...input, insideGit: false, enabled: false, snapshot: snapshot(null) }).findings).toEqual([]);
  });
});

function plannedAt(path: string, kind: PlannedChange['kind']): PlannedChange {
  return { path, realPath: join(ROOT, path), kind, owner: 'harness_entry', content: kind === 'delete' ? null : '{}', preview: { summary: path } };
}

function existingAt(path: string): FileSnapshot {
  return { ...snapshot('{}'), path, realPath: join(ROOT, path) };
}

describe('runtimeStatePaths lists the state files init writes under the runtime folder (prd-17 FR-01, CR-02, TC-02)', () => {
  const STATE = '.context-brake/runtime/claude-mod-install.json';
  const BRIDGE = '.context-brake/runtime/claude-statusline.json';

  it('adds planned and existing runtime files, once each, and nothing outside the runtime folder (FR-01, CR-02, TC-02)', () => {
    const paths = runtimeStatePaths([plannedAt(STATE, 'update'), plannedAt('.claude/settings.local.json', 'update')], [existingAt(BRIDGE), existingAt(STATE), existingAt('.claude/settings.local.json')]);
    expect(paths.sort()).toEqual([STATE, BRIDGE]);
  });
  it('drops a runtime file that the plan deletes, planned or existing (FR-02, CR-02, TC-02)', () => {
    expect(runtimeStatePaths([plannedAt(STATE, 'delete')], [existingAt(STATE)])).toEqual([]);
  });
});
