import { describe, expect, it } from 'vitest';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { probeExecutableVersion } from '../../src/infrastructure/harnesses/common/version-probes.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

describe('harness adapter version probing (RF1, RF2, RF9, CA-16)', () => {
  it('returns unknown status when runner is not provided', async () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      const probe = await adapter.probeVersion({ projectRoot: '.' });
      expect(probe.status).toBe('unknown');
      expect(probe.normalized).toBeNull();
    }
  });

  it('normalizes version when executable probe succeeds', async () => {
    const mockRunner: ProcessRunner = {
      discover: async () => [{ name: 'claude', path: '/bin/claude', timedOut: false }],
      run: async () => ({ status: 'completed', exitCode: 0, stdout: 'claude 1.2.3\n', stderr: '' }),
    };
    const probe = await probeExecutableVersion(mockRunner, ['claude']);
    expect(probe.status).toBe('resolved');
    expect(probe.normalized).toBe('1.2.3');
  });

  it('handles timeout during discovery or run', async () => {
    const timedOutRunner: ProcessRunner = {
      discover: async () => [{ name: 'claude', path: null, timedOut: true }],
      run: async () => ({ status: 'timed_out', exitCode: null, stdout: '', stderr: '' }),
    };
    const probe = await probeExecutableVersion(timedOutRunner, ['claude']);
    expect(probe.status).toBe('timed_out');
  });
});
