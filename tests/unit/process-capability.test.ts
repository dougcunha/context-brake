import { afterEach, describe, expect, it, vi } from 'vitest';
import { attemptExecutable, MissingPrerequisiteError, processPolicy, requireProcess } from '../helpers/process-capability.js';

const MISSING_BINARY = 'cb-t35-definitely-missing-binary';
const HANGING_TIMEOUT_MS = 100;
const EXITING_TIMEOUT_MS = 5000;

describe('T35/CR-06: process capability', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('proceeds when the executable is available, in CI and locally', () => {
    expect(processPolicy({ available: true, reason: '' }, false).action).toBe('proceed');
    expect(processPolicy({ available: true, reason: '' }, true).action).toBe('proceed');
  });

  it('skips locally but fails in CI when a required shell is unavailable', async () => {
    const skip = vi.fn((note?: string): never => { throw new MissingPrerequisiteError(`skipped: ${note}`); });
    vi.stubEnv('CI', 'false');
    await expect(requireProcess({ skip }, { available: false, reason: 'no bash binary' })).rejects.toThrow('skipped: no bash binary');
    vi.stubEnv('CI', 'true');
    await expect(requireProcess({ skip }, { available: false, reason: 'no bash binary' })).rejects.toThrow('no bash binary');
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: 'a zero exit as available', file: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: EXITING_TIMEOUT_MS, available: true, reason: '' },
    { name: 'a missing executable through the child error event', file: MISSING_BINARY, args: ['--version'], timeoutMs: EXITING_TIMEOUT_MS, available: false, reason: `${MISSING_BINARY} is unavailable on ${process.platform}` },
    { name: 'a hanging probe as timed out instead of blocking the suite', file: process.execPath, args: ['-e', 'setTimeout(() => {}, 5000)'], timeoutMs: HANGING_TIMEOUT_MS, available: false, reason: 'timed out' },
  ])('reports $name', async ({ file, args, timeoutMs, available, reason }) => {
    const attempt = await attemptExecutable(file, args, timeoutMs);

    expect(attempt.available).toBe(available);
    expect(attempt.reason).toContain(reason);
  });
});
