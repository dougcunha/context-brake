import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { applyIgnoreBlock, BLOCK_END, BLOCK_START, MALFORMED_MARKERS_MESSAGE } from '../../src/core/services/gitignore-block.js';
import { GITIGNORE_PATH, ownedPathsFor, planGitIgnore } from '../../src/core/services/gitignore-plan.js';

const ROOT = resolve('/project');
const PATHS = ['.context-brake/manifest.json', 'context-brake.config.json'];
const INPUT = { enabled: true, insideGit: true, paths: PATHS };
const PATHS_BLOCK = `${BLOCK_START}\n/.context-brake/manifest.json\n/context-brake.config.json\n${BLOCK_END}\n`;
const SUMMARY = "Keep ContextBrake's files out of Git";
const EMPTY_PLAN = { change: null, conflicts: [], findings: [], paths: [] };

function snapshot(content: string | null): FileSnapshot {
  return { path: GITIGNORE_PATH, realPath: join(ROOT, GITIGNORE_PATH), exists: content !== null, content, sha256: null, isSymlink: false, fileIdentity: '' };
}

function locateInRoot(path: string): string {
  return join(ROOT, path);
}

describe('ownedPathsFor lists the files ContextBrake owns (prd-17 FR-01, FR-03, TC-02)', () => {
  it('names the link path and the target path when a harness folder is a link into the repository (FR-01, FR-03, TC-02, BUG-01)', () => {
    const paths = ownedPathsFor(ROOT, ['.claude/hooks/context-brake.mjs'], (path) => (path.startsWith('.claude/') ? join(ROOT, '.agents', path.slice('.claude/'.length)) : locateInRoot(path)));
    expect(paths).toEqual(['.agents/hooks/context-brake.mjs', '.claude/hooks/context-brake.mjs', '.context-brake/manifest.json', 'context-brake.config.json']);
  });
  it('keeps the link path but skips a target outside the project (FR-03, TC-02, BUG-01)', () => {
    const outside = resolve(ROOT, '..', 'elsewhere', 'hook.mjs');
    const paths = ownedPathsFor(ROOT, ['.claude/hooks/hook.mjs'], (path) => (path.endsWith('hook.mjs') ? outside : locateInRoot(path)));
    expect(paths).toEqual(['.claude/hooks/hook.mjs', '.context-brake/manifest.json', 'context-brake.config.json']);
  });
});

describe('planGitIgnore plans one change on the root .gitignore (prd-17 FR-02, FR-04, FR-05, FR-07, TC-02)', () => {
  it.each([
    [null, 'create', PATHS_BLOCK],
    ['dist/\n', 'update', `dist/\n\n${PATHS_BLOCK}`],
  ] as const)('plans the file %j as a %s with the block, anchoring every line (FR-01, FR-04, TC-02)', (before, kind, content) => {
    const plan = planGitIgnore({ ...INPUT, snapshot: snapshot(before) });
    expect(plan).toEqual({ change: { path: '.gitignore', realPath: join(ROOT, '.gitignore'), kind, owner: 'gitignore', content, preview: { summary: SUMMARY } }, conflicts: [], findings: [], paths: PATHS });
  });
  it('plans nothing when the block is already current (FR-02, NFR-01, TC-02)', () => {
    const current = applyIgnoreBlock('dist/\n', PATHS.map((path) => `/${path}`));
    expect(planGitIgnore({ ...INPUT, snapshot: snapshot('content' in current ? current.content : null) }).change).toBeNull();
  });
});

describe('planGitIgnore opt-out, escapes, conflicts, and no Git (prd-17 FR-04, FR-05, FR-07, TC-02)', () => {
  it('removes the block and deletes a file that held only the block when disabled (FR-05, TC-02)', () => {
    const only = applyIgnoreBlock(null, ['/a']);
    const plan = planGitIgnore({ ...INPUT, enabled: false, snapshot: snapshot('content' in only ? only.content : null) });
    expect(plan.change).toMatchObject({ kind: 'delete', content: null });
    expect(plan.paths).toEqual([]);
  });
  it('escapes characters Git treats specially (FR-01, TC-02)', () => {
    const plan = planGitIgnore({ ...INPUT, paths: ['dir/[a]*?.mjs', 'dir/x '], snapshot: snapshot(null) });
    expect(plan.change?.content).toContain('/dir/\\[a]\\*\\?.mjs\n/dir/x\\ \n');
  });
  it('reports a conflict and no change for malformed markers (FR-04, TC-02)', () => {
    const plan = planGitIgnore({ ...INPUT, snapshot: snapshot(`${BLOCK_START}\n/a\n`) });
    expect(plan).toEqual({ change: null, conflicts: [{ path: '.gitignore', code: 'GITIGNORE_MARKERS_MALFORMED', detail: MALFORMED_MARKERS_MESSAGE }], findings: [], paths: PATHS });
  });
  it('writes nothing outside Git and says so only when the block is wanted (FR-07, TC-02)', () => {
    const wanted = planGitIgnore({ ...INPUT, insideGit: false, snapshot: snapshot(null) });
    const finding = { code: 'GITIGNORE_NO_GIT', severity: 'ok', scope: 'project', harness: null, path: '.gitignore' };
    expect(wanted).toEqual({ ...EMPTY_PLAN, findings: [expect.objectContaining(finding)] });
    expect(planGitIgnore({ ...INPUT, insideGit: false, enabled: false, snapshot: snapshot(null) })).toEqual(EMPTY_PLAN);
  });
});
