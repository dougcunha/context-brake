export type GitIgnoreFlags = {
  readonly gitignore: boolean;
  readonly noGitignore: boolean;
};
export type GitIgnoreUpdate = { readonly kind: 'keep' } | { readonly kind: 'set' } | { readonly kind: 'remove' };
export type GitIgnoreMerge = { readonly update: GitIgnoreUpdate } | { readonly error: string };

const GIT_IGNORE_KEY = 'gitIgnore';
const TOGGLE_CONFLICT = '--gitignore cannot be combined with --no-gitignore.';
const KEEP: GitIgnoreMerge = { update: { kind: 'keep' } };

export function isGitIgnoreEnabled(config: { readonly gitIgnore?: boolean | undefined } | null | undefined): boolean {
  return config?.gitIgnore !== false;
}
export function mergeGitIgnore(current: boolean | undefined, flags: GitIgnoreFlags): GitIgnoreMerge {
  if (flags.gitignore && flags.noGitignore) return { error: TOGGLE_CONFLICT };
  if (flags.noGitignore) return current === false ? KEEP : { update: { kind: 'set' } };
  if (flags.gitignore) return current === undefined ? KEEP : { update: { kind: 'remove' } };
  return KEEP;
}
export function applyGitIgnore<T extends { gitIgnore?: boolean | undefined }>(config: T, update: GitIgnoreUpdate): T {
  if (update.kind === 'keep') return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== GIT_IGNORE_KEY)) as T;
  return update.kind === 'remove' ? rest : { ...rest, gitIgnore: false };
}
