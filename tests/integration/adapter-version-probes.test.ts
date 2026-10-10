import { describe, expect, it } from 'vitest';
import type { ExecutableResult, ProcessRequest, ProcessRunner } from '../../src/core/contracts/processes.js';
import { probeExecutableVersion } from '../../src/infrastructure/harnesses/common/version-probes.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

const FLOOR = '2.0.0';

function discoveryRunner(discovered: readonly ExecutableResult[], requests: ProcessRequest[] = []): ProcessRunner {
  return {
    discover: async () => discovered,
    run: async (request) => {
      requests.push(request);
      return { status: 'completed', exitCode: 0, stdout: 'claude 1.2.3\n', stderr: '' };
    },
  };
}

describe('harness adapter version probing (RF1, RF2, RF9, CA-16)', () => {
  it('returns an unknown probe from every adapter when no runner is provided', async () => {
    for (const adapter of getAllAdapters()) {
      const probe = await adapter.probeVersion({ projectRoot: '.' });
      expect(probe).toEqual({ status: 'unknown', display: null, normalized: null, source: 'executable', minimumVersion: null });
    }
  });

  it('runs --version on the first discovered path and compares it with the floor', async () => {
    const requests: ProcessRequest[] = [];
    const runner = discoveryRunner([{ name: 'claude-code', path: null, timedOut: false }, { name: 'claude', path: '/bin/claude', timedOut: false }], requests);
    const probe = await probeExecutableVersion(runner, ['claude-code', 'claude'], FLOOR);
    expect(requests).toEqual([{ executable: '/bin/claude', args: ['--version'], timeoutMilliseconds: 2000 }]);
    expect(probe).toEqual({ status: 'old', display: 'claude 1.2.3', normalized: '1.2.3', source: 'executable', minimumVersion: FLOOR });
  });

  it.each([
    { case: 'a timed-out search', discovered: [{ name: 'claude', path: null, timedOut: true }], status: 'timed_out' },
    { case: 'a missing executable', discovered: [{ name: 'claude', path: null, timedOut: false }], status: 'unknown' },
    { case: 'no candidates', discovered: [], status: 'unknown' },
  ] as const)('returns $status without running anything for $case', async ({ discovered, status }) => {
    const requests: ProcessRequest[] = [];
    const probe = await probeExecutableVersion(discoveryRunner(discovered, requests), ['claude'], FLOOR);
    expect(requests).toEqual([]);
    expect(probe).toEqual({ status, display: null, normalized: null, source: 'executable', minimumVersion: FLOOR });
  });
});
