import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import { hasConfigurationFlag, parseInit } from '../../src/cli/init-arguments.js';

describe('init --snapshot-trigger-percentage', () => {
  it('parses the percentage into the snapshot flags and counts as a configuration flag', () => {
    const parsed = parseInit(['--snapshot-trigger-percentage', '70']);
    expect(parsed.snapshot).toMatchObject({ triggerPercentage: 70 });
    expect(hasConfigurationFlag(parsed)).toBe(true);
  });
  it.each(['0', '101', 'abc', '7.5'])('rejects %s', (value) => {
    expect(() => parseInit(['--snapshot-trigger-percentage', value])).toThrow(CliArgumentError);
  });
  it('rejects the percentage together with a trigger zone', () => {
    expect(() => parseInit(['--snapshot-trigger', 'RED', '--snapshot-trigger-percentage', '70'])).toThrow('--snapshot-trigger cannot be combined with --snapshot-trigger-percentage.');
  });
});
