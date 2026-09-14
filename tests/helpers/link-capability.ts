import { lstat, symlink } from 'node:fs/promises';

export type LinkKind = 'dir' | 'file';
export type LinkAttempt = { readonly created: boolean; readonly reason: string };
export type LinkPolicy = { readonly action: 'proceed' } | { readonly action: 'skip' | 'fail'; readonly reason: string };

export function ciRequiresLinks(): boolean {
  return process.env.CI === 'true' || process.env.CI === '1';
}

export function linkPolicy(attempt: LinkAttempt, ciRequired: boolean): LinkPolicy {
  if (attempt.created) return { action: 'proceed' };
  return ciRequired ? { action: 'fail', reason: attempt.reason } : { action: 'skip', reason: attempt.reason };
}

export async function attemptLink(target: string, link: string, kind: LinkKind = 'dir'): Promise<LinkAttempt> {
  const type = process.platform === 'win32' && kind === 'dir' ? 'junction' : kind;
  try {
    await symlink(target, link, type);
    return { created: true, reason: '' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { created: false, reason: `unavailable ${kind} link capability on ${process.platform}: ${detail}` };
  }
}

export function linkExists(link: string): Promise<boolean> {
  return lstat(link).then(() => true).catch(() => false);
}

export async function requireLink(ctx: { skip: (note?: string) => never }, attempt: LinkAttempt, link: string): Promise<void> {
  const policy = linkPolicy(attempt, ciRequiresLinks());
  if (policy.action === 'fail') throw new Error(policy.reason);
  if (policy.action === 'skip') ctx.skip(policy.reason);
  if (!(await linkExists(link))) throw new Error(`link ${link} was created but is missing on ${process.platform}`);
}
