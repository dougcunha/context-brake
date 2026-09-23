import { describe, expect, it } from 'vitest';
import type { GitInspector, GitState } from '../../src/core/contracts/git.js';
import { compareGitState } from '../../src/core/services/git-divergence.js';

const now = new Date('2026-09-17T12:00:00.000Z');
const recorded = { branch: 'main', lastCommitHash: 'a'.repeat(40), cleanWorkingTree: true };
const current: GitState = {
  status: 'available', branch: 'main', headCommit: 'b'.repeat(40),
  cleanWorkingTree: true, recordedCommit: 'ancestor',
};

describe('git divergence (RF14, RF16, TC-09, TC-10, TC-12)', () => {
  it('accepts a clean descendant supplied by the inspector port', async () => {
    const inspector: GitInspector = {
      inspect: async (hash) => {
        expect(hash).toBe(recorded.lastCommitHash);
        return current;
      },
    };
    const reading = await inspector.inspect(recorded.lastCommitHash);
    expect(compareGitState({ recorded, current: reading, now })).toEqual({ checkedAt: now.toISOString(), divergences: [] });
  });

  it('names both commits when the recorded commit is outside current history (CA-09)', () => {
    const result = compareGitState({ recorded, current: { ...current, recordedCommit: 'outside_history' }, now });
    expect(result.divergences).toContainEqual({
      kind: 'outside_history', recordedCommit: recorded.lastCommitHash, currentCommit: current.headCommit,
    });
  });

  it('distinguishes a missing commit from one outside history', () => {
    const result = compareGitState({ recorded, current: { ...current, recordedCommit: 'missing' }, now });
    expect(result.divergences).toEqual([{ kind: 'missing_commit', recordedCommit: recorded.lastCommitHash }]);
  });
});

describe('git divergence at repository boundaries (RF14, RF16)', () => {
  it('reports outside history when the current branch has no head commit', () => {
    const result = compareGitState({ recorded, current: { ...current, headCommit: null, recordedCommit: 'outside_history' }, now });
    expect(result.divergences).toEqual([{ kind: 'outside_history', recordedCommit: recorded.lastCommitHash, currentCommit: null }]);
  });

  it('reports uncommitted changes and a changed branch', () => {
    const result = compareGitState({ recorded, current: { ...current, cleanWorkingTree: false, branch: 'feature' }, now });
    expect(result.divergences).toEqual([
      { kind: 'pending_changes' },
      { kind: 'branch_changed', recordedBranch: 'main', currentBranch: 'feature' },
    ]);
  });

  it('reports omitted checks and keeps the caller supplied clock (CA-12)', () => {
    const result = compareGitState({ recorded, current: { status: 'unavailable', reason: 'git_missing' }, now });
    expect(result).toEqual({ checkedAt: now.toISOString(), divergences: [{ kind: 'checks_omitted', reason: 'git_missing' }] });
  });
});
