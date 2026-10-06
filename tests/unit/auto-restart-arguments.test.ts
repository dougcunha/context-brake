import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import { planConfigUpdates } from '../../src/cli/init-config-updates.js';
import { assertAutoRestartTarget, parseInit } from '../../src/cli/init-arguments.js';
import type { AutoRestartConfig } from '../../src/core/contracts/auto-restart.js';
import type { HarnessDetection } from '../../src/core/contracts/harness.js';
import { applyAutoRestart, isAutoRestartWanted, mergeAutoRestart } from '../../src/core/services/auto-restart-merge.js';

const NO_FLAGS = { autoRestart: false, noAutoRestart: false };
const CURRENT = { maxConsecutiveRestarts: 5 };

function detection(harness: HarnessDetection['harness'], state: HarnessDetection['state']): HarnessDetection {
  return { harness, state, evidence: [], selectedExplicitly: false, version: null, versionSource: null };
}

describe('auto restart flag merge (FR-07, DEC-09, TC-21)', () => {
  it('sets the block only when it is absent, and keeps an existing value', () => {
    expect(mergeAutoRestart(undefined, { ...NO_FLAGS, autoRestart: true })).toEqual({ update: { kind: 'set' } });
    expect(mergeAutoRestart(CURRENT, { ...NO_FLAGS, autoRestart: true })).toEqual({ update: { kind: 'keep' } });
  });

  it('removes the block only when it is present', () => {
    expect(mergeAutoRestart(CURRENT, { ...NO_FLAGS, noAutoRestart: true })).toEqual({ update: { kind: 'remove' } });
    expect(mergeAutoRestart(undefined, { ...NO_FLAGS, noAutoRestart: true })).toEqual({ update: { kind: 'keep' } });
  });

  it('keeps everything without a flag and rejects both flags together', () => {
    expect(mergeAutoRestart(CURRENT, NO_FLAGS)).toEqual({ update: { kind: 'keep' } });
    expect(mergeAutoRestart(undefined, { autoRestart: true, noAutoRestart: true })).toHaveProperty('error');
  });

  it('applies the update to a configuration without mutating it', () => {
    const config: { schemaVersion: number; autoRestart?: AutoRestartConfig } = { schemaVersion: 1 };
    expect(applyAutoRestart(config, { kind: 'set' })).toEqual({ schemaVersion: 1, autoRestart: { maxConsecutiveRestarts: 2 } });
    expect(applyAutoRestart({ ...config, autoRestart: CURRENT }, { kind: 'remove' })).toEqual(config);
    expect(config).toEqual({ schemaVersion: 1 });
  });

  it('wants the feature when it is being set or already present and not removed', () => {
    expect(isAutoRestartWanted(undefined, { kind: 'set' })).toBe(true);
    expect(isAutoRestartWanted(CURRENT, { kind: 'keep' })).toBe(true);
    expect(isAutoRestartWanted(CURRENT, { kind: 'remove' })).toBe(false);
    expect(isAutoRestartWanted(undefined, { kind: 'keep' })).toBe(false);
  });
});

describe('auto restart command line (FR-07, TC-21)', () => {
  it('parses both flags', () => {
    expect(parseInit(['--auto-restart']).autoRestart).toBe(true);
    expect(parseInit(['--no-auto-restart']).noAutoRestart).toBe(true);
  });

  it('rejects both flags together with a message that names them', () => {
    expect(() => planConfigUpdates(null, parseInit(['--auto-restart', '--no-auto-restart']))).toThrow(CliArgumentError);
    expect(() => planConfigUpdates(null, parseInit(['--auto-restart', '--no-auto-restart']))).toThrow('--auto-restart cannot be combined with --no-auto-restart.');
  });

  it('requires claude-code among the target harnesses', () => {
    expect(() => parseInit(['--auto-restart', '--exclude-harness', 'claude-code'])).toThrow(CliArgumentError);
    expect(() => parseInit(['--no-auto-restart', '--harness', 'codex-cli'])).toThrow(CliArgumentError);
    expect(() => assertAutoRestartTarget(parseInit(['--auto-restart']), [detection('codex-cli', 'project')])).toThrow(CliArgumentError);
    expect(() => assertAutoRestartTarget(parseInit(['--auto-restart']), [detection('claude-code', 'project')])).not.toThrow();
  });

  it('accepts runs without the flags whatever the harnesses are', () => {
    expect(() => assertAutoRestartTarget(parseInit([]), [detection('codex-cli', 'project')])).not.toThrow();
    expect(() => parseInit(['--exclude-harness', 'claude-code'])).not.toThrow();
  });
});
