import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import { parsePlan } from '../../src/cli/plan-arguments.js';

describe('plan argument parser: validation errors (O-01, DEC-14)', () => {
  it('throws on missing subcommand', () => {
    expect(() => parsePlan([])).toThrow(CliArgumentError);
    expect(() => parsePlan([])).toThrow('Missing plan subcommand');
  });

  it('throws on unknown subcommand', () => {
    expect(() => parsePlan(['unknown'])).toThrow(CliArgumentError);
    expect(() => parsePlan(['unknown'])).toThrow("Unknown plan subcommand 'unknown'");
  });

  it('throws when plan init lacks --task or gives empty task', () => {
    expect(() => parsePlan(['init'])).toThrow(CliArgumentError);
    expect(() => parsePlan(['init', '--task='])).toThrow(CliArgumentError);
    expect(() => parsePlan(['init', '--task=   '])).toThrow(CliArgumentError);
  });
});

describe('plan argument parser: successful parsing (O-01, DEC-14)', () => {
  it('parses valid plan init options and flags', () => {
    const parsed = parsePlan(['init', '--task=my-task', '--yes', '--json']);
    expect(parsed).toEqual({
      command: 'plan',
      subcommand: 'init',
      task: 'my-task',
      yes: true,
      json: true,
    });
  });

  it('parses plan status with and without flags', () => {
    expect(parsePlan(['status'])).toEqual({
      command: 'plan',
      subcommand: 'status',
      json: false,
    });
    expect(parsePlan(['status', '--json'])).toEqual({
      command: 'plan',
      subcommand: 'status',
      json: true,
    });
  });
});

