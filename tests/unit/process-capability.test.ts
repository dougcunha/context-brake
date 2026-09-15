import { afterEach, describe, expect, it, vi } from 'vitest';
import { attemptExecutable, ciRequiresProcesses, MissingPrerequisiteError, processPolicy, requireProcess } from '../helpers/process-capability.js';

const PROBE_TIMEOUT_MS = 100;

describe('T35/CR-06: process capability policy', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('proceeds when the executable is available, in CI and locally', () => {
    expect(processPolicy({ available: true, reason: '' }, false).action).toBe('proceed');
    expect(processPolicy({ available: true, reason: '' }, true).action).toBe('proceed');
  });

  it('skips with the captured reason when a local environment lacks the shell', () => {
    const policy = processPolicy({ available: false, reason: 'bash is unavailable on win32: ENOENT' }, false);

    expect(policy).toEqual({ action: 'skip', reason: 'bash is unavailable on win32: ENOENT' });
    expect(policy.reason.length).toBeGreaterThan(0);
  });

  it('fails in CI mode when the shell is unavailable', () => {
    expect(processPolicy({ available: false, reason: 'no bash binary' }, true)).toEqual({ action: 'fail', reason: 'no bash binary' });
  });

  it('requires the process only for an explicit CI environment', () => {
    vi.stubEnv('CI', 'true');
    expect(ciRequiresProcesses()).toBe(true);
    vi.stubEnv('CI', 'false');
    expect(ciRequiresProcesses()).toBe(false);
  });
});

describe('T35/CR-06: process probes and skip/failure routing', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('skips locally but fails in CI when a required shell is unavailable', async () => {
    const skip = vi.fn((note?: string): never => { throw new MissingPrerequisiteError(`skipped: ${note}`); });
    vi.stubEnv('CI', 'false');
    await expect(requireProcess({ skip }, { available: false, reason: 'no bash binary' })).rejects.toThrow('skipped: no bash binary');
    vi.stubEnv('CI', 'true');
    await expect(requireProcess({ skip }, { available: false, reason: 'no bash binary' })).rejects.toThrow('no bash binary');
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it('reports a missing executable through the child error event without throwing', async () => {
    const attempt = await attemptExecutable('cb-t35-definitely-missing-binary', ['--version']);

    expect(attempt.available).toBe(false);
    expect(attempt.reason).toContain('cb-t35-definitely-missing-binary');
    expect(attempt.reason).toContain(process.platform);
  });

  it('bounds a hanging probe with the timeout instead of blocking the suite', async () => {
    const attempt = await attemptExecutable(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], PROBE_TIMEOUT_MS);

    expect(attempt.available).toBe(false);
    expect(attempt.reason).toContain('timed out');
  });
});
