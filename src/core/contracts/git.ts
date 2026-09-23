export type GitState =
  | { readonly status: 'unavailable'; readonly reason: 'git_missing' | 'not_repository' | 'inspection_failed' }
  | {
      readonly status: 'available';
      readonly branch: string | null;
      readonly headCommit: string | null;
      readonly cleanWorkingTree: boolean;
      readonly recordedCommit: 'not_checked' | 'ancestor' | 'missing' | 'outside_history';
    };

export type GitDivergence =
  | { readonly kind: 'checks_omitted'; readonly reason: string }
  | { readonly kind: 'missing_commit'; readonly recordedCommit: string }
  | { readonly kind: 'outside_history'; readonly recordedCommit: string; readonly currentCommit: string | null }
  | { readonly kind: 'pending_changes' }
  | { readonly kind: 'branch_changed'; readonly recordedBranch: string; readonly currentBranch: string | null };

export type GitComparison = { readonly checkedAt: string; readonly divergences: readonly GitDivergence[] };

export interface GitInspector {
  inspect(recordedCommit: string | null): Promise<GitState>;
}
