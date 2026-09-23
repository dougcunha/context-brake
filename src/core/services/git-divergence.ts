import type { GitComparison, GitDivergence, GitState } from '../contracts/git.js';
import type { GitStateRecord } from '../contracts/state-checkpoint.js';

export type GitComparisonInput = { readonly recorded: GitStateRecord; readonly current: GitState; readonly now: Date };

export function compareGitState(input: GitComparisonInput): GitComparison {
  const { recorded, current } = input;
  if (current.status === 'unavailable') {
    return { checkedAt: input.now.toISOString(), divergences: [{ kind: 'checks_omitted', reason: current.reason }] };
  }
  const divergences: GitDivergence[] = [];
  if (recorded.lastCommitHash !== null && current.recordedCommit === 'missing') {
    divergences.push({ kind: 'missing_commit', recordedCommit: recorded.lastCommitHash });
  }
  if (recorded.lastCommitHash !== null && current.recordedCommit === 'outside_history') {
    divergences.push({ kind: 'outside_history', recordedCommit: recorded.lastCommitHash, currentCommit: current.headCommit });
  }
  if (!current.cleanWorkingTree) divergences.push({ kind: 'pending_changes' });
  if (recorded.branch !== null && recorded.branch !== current.branch) {
    divergences.push({ kind: 'branch_changed', recordedBranch: recorded.branch, currentBranch: current.branch });
  }
  return { checkedAt: input.now.toISOString(), divergences };
}
