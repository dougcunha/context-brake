import { describe, expect, it } from 'vitest';
import { CliArgumentError, parseCliArgs } from '../../src/cli/argument-parser.js';

describe('doctor arguments (FR-12, DEC-12, TC-11)', () => {
  it('turns verbose off by default', () => {
    expect(parseCliArgs(['doctor'])).toEqual({ command: 'doctor', json: false, verbose: false, harness: [] });
  });
  it('accepts --verbose together with --json', () => {
    expect(parseCliArgs(['doctor', '--json', '--verbose'])).toMatchObject({ command: 'doctor', json: true, verbose: true });
  });
  it('rejects a misspelled flag', () => {
    expect(() => parseCliArgs(['doctor', '--verbos'])).toThrow(CliArgumentError);
  });
});
