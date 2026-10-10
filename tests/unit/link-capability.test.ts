import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attemptLink, linkExists, linkPolicy, requireLink } from '../helpers/link-capability.js';

describe('T14/CR-04: link capability', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('proceeds when the link was created, in CI and locally', () => {
    expect(linkPolicy({ created: true, reason: '' }, false).action).toBe('proceed');
    expect(linkPolicy({ created: true, reason: '' }, true).action).toBe('proceed');
  });

  it('skips locally but fails in CI when the required link is unavailable', async () => {
    const skip = vi.fn((note?: string): never => { throw new Error(`skipped: ${note}`); });
    vi.stubEnv('CI', 'false');
    await expect(requireLink({ skip }, { created: false, reason: 'no link privilege' }, 'some/link')).rejects.toThrow('skipped: no link privilege');
    const ciReason = `unavailable dir link capability on ${process.platform}: EPERM`;
    vi.stubEnv('CI', 'true');
    await expect(requireLink({ skip }, { created: false, reason: ciReason }, 'some/link')).rejects.toThrow(ciReason);
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it('captures platform and error detail when the link cannot be created', async () => {
    const attempt = await attemptLink(tmpdir(), join(tmpdir(), 'cb-t14-missing-parent', 'link'), 'dir');

    expect(attempt.created).toBe(false);
    expect(attempt.reason).toContain(process.platform);
    expect(attempt.reason.length).toBeGreaterThan(20);
  });

  it('detects an existing path and a missing path without throwing', async () => {
    expect(await linkExists('tests/unit/link-capability.test.ts')).toBe(true);
    expect(await linkExists('tests/unit/does-not-exist.ts')).toBe(false);
  });
});
