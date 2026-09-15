import { afterEach, describe, expect, it, vi } from 'vitest';
import { ciRequiresGit, GitUnavailableError, gitPolicy, requireGit } from '../helpers/git-capability.js';

describe('T32/IT-18: git capability policy', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('proceeds when git is available, in CI and locally', () => {
    expect(gitPolicy({ available: true, reason: '' }, false).action).toBe('proceed');
    expect(gitPolicy({ available: true, reason: '' }, true).action).toBe('proceed');
  });

  it('skips with the captured reason when a local environment has no git', () => {
    const policy = gitPolicy({ available: false, reason: 'git is unavailable on win32: ENOENT' }, false);

    expect(policy).toEqual({ action: 'skip', reason: 'git is unavailable on win32: ENOENT' });
    if (policy.action === 'skip') expect(policy.reason.length).toBeGreaterThan(0);
  });

  it('fails in CI mode when git is unavailable', () => {
    expect(gitPolicy({ available: false, reason: 'no git binary' }, true)).toEqual({ action: 'fail', reason: 'no git binary' });
  });

  it('requires git only for an explicit CI environment', () => {
    vi.stubEnv('CI', 'true');
    expect(ciRequiresGit()).toBe(true);
    vi.stubEnv('CI', 'false');
    expect(ciRequiresGit()).toBe(false);
  });
});

describe('T32/IT-18: git skip and failure routing', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('skips locally but fails in CI when git is unavailable', async () => {
    const skip = vi.fn((note?: string): never => { throw new GitUnavailableError(`skipped: ${note}`); });
    vi.stubEnv('CI', 'false');
    await expect(requireGit({ skip }, { available: false, reason: 'no git binary' })).rejects.toThrow('skipped: no git binary');
    vi.stubEnv('CI', 'true');
    await expect(requireGit({ skip }, { available: false, reason: 'no git binary' })).rejects.toThrow('no git binary');
    expect(skip).toHaveBeenCalledTimes(1);
  });
});
