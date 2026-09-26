import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import type { HarnessDetection } from '../../src/core/contracts/harness.js';
import { assertStatuslineBridgeTarget, parseInit } from '../../src/cli/init-arguments.js';

describe('init status line bridge flags (FR-01, FR-08, DEC-08, TC-15)', () => {
  it.each([
    [[], undefined],
    [['--statusline-bridge'], 'install'],
    [['--no-statusline-bridge'], 'remove'],
    [['--statusline-bridge', '--harness', 'claude-code', '--harness', 'cursor'], 'install'],
  ])('maps %j to %s', (args, expected) => {
    expect(parseInit(args).statuslineBridge).toBe(expected);
  });

  it.each([
    ['both flags together', ['--statusline-bridge', '--no-statusline-bridge']],
    ['a flag with claude-code excluded', ['--statusline-bridge', '--exclude-harness', 'claude-code']],
    ['a flag with only other harnesses targeted', ['--no-statusline-bridge', '--harness', 'cursor']],
  ])('rejects %s as an argument error', (_case, args) => {
    expect(() => parseInit(args)).toThrow(CliArgumentError);
  });
});

function detection(harness: HarnessDetection['harness'], state: HarnessDetection['state']): HarnessDetection {
  return { harness, state, evidence: [], selectedExplicitly: false, version: null, versionSource: null };
}

describe('status line bridge flags after detection (DEC-08, TC-15, codereview_01/CR-06)', () => {
  it('rejects either flag when claude-code is not detected in the project', () => {
    expect(() => assertStatuslineBridgeTarget('install', [detection('cursor', 'project'), detection('claude-code', 'candidate')])).toThrow(CliArgumentError);
    expect(() => assertStatuslineBridgeTarget('remove', [])).toThrow(CliArgumentError);
  });

  it('accepts the flags when claude-code is detected, and no flag at all', () => {
    expect(() => assertStatuslineBridgeTarget('install', [detection('claude-code', 'project')])).not.toThrow();
    expect(() => assertStatuslineBridgeTarget(undefined, [])).not.toThrow();
  });
});
