import { describe, expect, it } from 'vitest';
import type { ProcessResult } from '../../src/core/contracts/processes.js';
import { normalizeVersion, versionFromProcess } from '../../src/core/services/version-service.js';

const FLOOR = '2.0.0';

function processResult(status: ProcessResult['status'], stderr: string): ProcessResult {
  return { status, exitCode: status === 'completed' ? 0 : null, stdout: '\n', stderr };
}

describe('normalizeVersion (RF1, RF9, CA-16)', () => {
  it.each([
    { display: null, status: 'unknown', shown: null, normalized: null },
    { display: 42, status: 'malformed', shown: null, normalized: null },
    { display: 'not a version string', status: 'malformed', shown: 'not a version string', normalized: null },
    { display: 'Harness v2.0.0-beta.1', status: 'old', shown: 'Harness v2.0.0-beta.1', normalized: '2.0.0-beta.1' },
    { display: 'claude 2.0.0', status: 'resolved', shown: 'claude 2.0.0', normalized: '2.0.0' },
  ] as const)('reads $display as $status against the floor (UT-15)', ({ display, status, shown, normalized }) => {
    const version = normalizeVersion({ display, minimumVersion: FLOOR });
    expect(version).toEqual({ status, display: shown, normalized, source: 'executable', minimumVersion: FLOOR });
  });

  it('resolves any version without a floor and rejects an invalid floor', () => {
    expect(normalizeVersion({ display: 'claude 1.0.0', source: 'config' })).toEqual({ status: 'resolved', display: 'claude 1.0.0', normalized: '1.0.0', source: 'config', minimumVersion: null });
    expect(() => normalizeVersion({ display: 'claude 1.0.0', minimumVersion: 'latest' })).toThrow('Invalid minimum semantic version: latest');
  });
});

describe('versionFromProcess (RF1, CA-16)', () => {
  it.each([
    { result: processResult('timed_out', ''), status: 'timed_out', display: null, normalized: null },
    { result: processResult('failed', 'claude 2.1.0'), status: 'unknown', display: 'claude 2.1.0', normalized: null },
    { result: processResult('completed', 'claude 2.1.0'), status: 'resolved', display: 'claude 2.1.0', normalized: '2.1.0' },
  ])('turns a $result.status process into a $status probe, reading stderr when stdout is blank', ({ result, status, display, normalized }) => {
    expect(versionFromProcess({ result, minimumVersion: FLOOR })).toEqual({ status, display, normalized, source: 'executable', minimumVersion: FLOOR });
  });
});
