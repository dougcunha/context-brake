import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import type { HarnessDetection } from '../../src/core/contracts/harness.js';
import { assertAutoRestartTarget, assertStatuslineBridgeTarget, parseInit } from '../../src/cli/init-arguments.js';
import { parseCliArgs } from '../../src/cli/argument-parser.js';
import { planConfigUpdates } from '../../src/cli/init-config-updates.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

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

describe('init debug flags (TC-02, FR-01, FR-04)', () => {
  it.each([
    [['--debug'], true, false],
    [['--no-debug'], false, true],
  ])('parses %j as debug=%s and noDebug=%s', (args, debug, noDebug) => {
    expect(parseInit(args)).toMatchObject({ debug, noDebug });
  });
});

describe('removed mode flags (prd-12 FR-02, TC-06)', () => {
  it.each([['--light'], ['--no-light'], ['--snapshot-path', 'a.md'], ['--snapshot-skill', 'x'], ['--no-delegated-snapshot'], ['--instruction-file', 'A.md'], ['--create-instructions'], ['--migrate-legacy']])('rejects %s', (...args) => {
    expect(() => parseInit(args)).toThrow(`Unknown option '${args[0]}'`);
  });
  it('rejects remove --remove-state (prd-12 FR-08, DEC-04)', () => {
    expect(() => parseCliArgs(['remove', '--remove-state'])).toThrow("Unknown option '--remove-state'");
  });
  it('maps the snapshot flags', () => {
    expect(parseInit(['--snapshot-command', '/s', '--snapshot-trigger', 'YELLOW', '--resume-command', '/r']).snapshot).toEqual({ command: '/s', triggerZone: 'YELLOW', resumeCommand: '/r', clearCommand: false });
    expect(parseInit(['--no-snapshot-command']).snapshot?.clearCommand).toBe(true);
  });
});

describe('auto restart command line (prd-11 FR-07, TC-21)', () => {
  it('rejects both flags together with a message that names them', () => {
    expect(() => planConfigUpdates(null, parseInit(['--auto-restart', '--no-auto-restart']))).toThrow(new CliArgumentError('--auto-restart cannot be combined with --no-auto-restart.'));
  });

  it('requires one harness active in the project with a restart mode (prd-14 DEC-11, TC-13)', () => {
    const autoRestart = parseInit(['--auto-restart', '--exclude-harness', 'claude-code']);
    expect(() => assertAutoRestartTarget(autoRestart, [detection('antigravity-cli', 'project'), detection('opencode', 'project')], getAllAdapters())).toThrow('--auto-restart needs at least one active harness with a restart mode');
    expect(() => assertAutoRestartTarget(autoRestart, [detection('codex-cli', 'candidate')], getAllAdapters())).toThrow(CliArgumentError);
    expect(() => assertAutoRestartTarget(autoRestart, [detection('codex-cli', 'project')], getAllAdapters())).not.toThrow();
    expect(() => assertAutoRestartTarget(autoRestart, [detection('pi', 'project')], getAllAdapters())).not.toThrow();
    expect(() => assertAutoRestartTarget(parseInit(['--no-auto-restart']), [detection('antigravity-cli', 'project')], getAllAdapters())).not.toThrow();
  });
});
