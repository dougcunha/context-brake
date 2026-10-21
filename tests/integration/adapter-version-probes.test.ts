import { describe, expect, it } from 'vitest';
import type { ExecutableResult, ProcessRequest, ProcessRunner } from '../../src/core/contracts/processes.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { CLAUDE_MINIMUM_VERSION } from '../../src/infrastructure/harnesses/claude-code/capabilities.js';
import { probeExecutableVersion } from '../../src/infrastructure/harnesses/common/version-probes.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

const FLOOR = '2.0.0';

function discoveryRunner(discovered: readonly ExecutableResult[], requests: ProcessRequest[] = [], stdout = 'claude 1.2.3\n'): ProcessRunner {
  return {
    discover: async () => discovered,
    run: async (request) => {
      requests.push(request);
      return { status: 'completed', exitCode: 0, stdout, stderr: '' };
    },
  };
}

function claudeRunner(stdout: string): ProcessRunner {
  return discoveryRunner([{ name: 'claude', path: '/bin/claude', timedOut: false }], [], stdout);
}

describe('harness adapter version probing (RF1, RF2, RF9, CA-16)', () => {
  it('returns an unknown probe from every adapter when no runner is provided, with a floor only for claude-code (TC-01)', async () => {
    for (const adapter of getAllAdapters()) {
      const probe = await adapter.probeVersion({ projectRoot: '.' });
      const minimumVersion = adapter.id === 'claude-code' ? CLAUDE_MINIMUM_VERSION : null;
      expect(probe).toEqual({ status: 'unknown', display: null, normalized: null, source: 'executable', minimumVersion });
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

describe('Claude Code minimum version (PRD-22 FR-01, FR-03)', () => {
  it('resolves a Claude Code version at or above the 2.1.97 floor (TC-02)', async () => {
    const probe = await new ClaudeAdapter().probeVersion({ projectRoot: '.', runner: claudeRunner('2.1.300 (Claude Code)\n') });
    expect(probe).toMatchObject({ status: 'resolved', normalized: '2.1.300', minimumVersion: '2.1.97' });
  });

  it('marks a Claude Code version below the floor as old and gates its telemetry capabilities (TC-03)', async () => {
    const adapter = new ClaudeAdapter();
    const probe = await adapter.probeVersion({ projectRoot: '.', runner: claudeRunner('2.1.96 (Claude Code)\n') });
    const profile = adapter.capabilityProfile(probe);
    expect(probe.status).toBe('old');
    expect(profile.capabilities.filter((capability) => capability.state === 'supported')).toEqual([]);
    expect(profile.limitations.map((limitation) => limitation.capability)).toEqual(expect.arrayContaining(['post_tool_telemetry', 'session_boot']));
    expect(profile.limitations.find((limitation) => limitation.capability === 'session_boot')?.impact).toContain('older than minimum 2.1.97');
  });
});
