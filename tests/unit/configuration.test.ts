import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError, parseConfiguration, type ConfigurationIssue } from '../../src/core/validation/configuration-validator.js';

function configurationIssues(input: unknown): ConfigurationIssue[] {
  try {
    parseConfiguration(input);
  } catch (error) {
    if (error instanceof InvalidConfigurationError) return error.issues;
    throw error;
  }
  return [];
}
function v1FileWithoutBrake(): unknown {
  const file: Record<string, unknown> = { ...DEFAULT_CONFIG };
  delete file['brake'];
  return file;
}
function withAdditionalCommands(commands: string[]): Record<string, unknown> {
  return { ...DEFAULT_CONFIG, brake: { additionalAllowedCommands: commands } };
}

describe('configuration contract (RF15, RF16, UT-12)', () => {
  it('parses the canonical defaults', () => expect(parseConfiguration(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG));
  it('reports the received source value for invalid zone ordering', () => {
    const invalid = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, yellowMaxPercentage: 40 } } };
    expect(() => parseConfiguration(invalid)).toThrow(InvalidConfigurationError);
    try { parseConfiguration(invalid); } catch (error) { expect(error).toBeInstanceOf(InvalidConfigurationError); expect((error as InvalidConfigurationError).issues).toContainEqual({ path: 'telemetry.zones.yellowMaxPercentage', received: 40, rule: 'must be greater than greenMaxPercentage' }); }
  });
  it('rejects absolute paths and unknown fields', () => {
    const invalid = { ...DEFAULT_CONFIG, extra: true, instructionFiles: { ...DEFAULT_CONFIG.instructionFiles, protocolFile: '/outside.md' } };
    expect(() => parseConfiguration(invalid)).toThrow(InvalidConfigurationError);
  });
  it('rejects non-increasing turn limits (RF16)', () => {
    const invalid = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, criticalTurn: 7 } } };
    let captured: unknown;
    try { parseConfiguration(invalid); } catch (error) { captured = error; }
    expect(captured).toBeInstanceOf(InvalidConfigurationError);
    expect((captured as InvalidConfigurationError).issues.some((issue) => issue.rule === 'must be less than criticalTurn')).toBe(true);
  });
});

describe('canonical configuration paths (RF16)', () => {
  it.each(['.', './task_plan.json', 'state//task_plan.json', 'state/./task_plan.json', 'state/', '../outside.md', '../../outside.md', 'folder/../../outside', 'folder\\task_plan.json', '\\\\server\\share\\file', 'C:/outside.md', 'C:\\outside.md'])('rejects unsafe path %s (RF16)', (path) => {
    const invalid = { ...DEFAULT_CONFIG, instructionFiles: { ...DEFAULT_CONFIG.instructionFiles, protocolFile: path } };
    expect(() => parseConfiguration(invalid)).toThrow(InvalidConfigurationError);
  });
  it('accepts normalized POSIX paths', () => {
    const valid = { ...DEFAULT_CONFIG, instructionFiles: { ...DEFAULT_CONFIG.instructionFiles, protocolFile: 'docs/context-brake-protocol.md' } };
    expect(parseConfiguration(valid).instructionFiles.protocolFile).toBe(valid.instructionFiles.protocolFile);
    expect(parseConfiguration({ ...DEFAULT_CONFIG, stateStorage: { ...DEFAULT_CONFIG.stateStorage, planFile: 'a' } }).stateStorage.planFile).toBe('a');
  });
  it('rejects canonical duplicate instruction identities', () => {
    const invalid = { ...DEFAULT_CONFIG, instructionFiles: { ...DEFAULT_CONFIG.instructionFiles, targets: ['AGENTS.md', 'AGENTS.md'] } };
    expect(() => parseConfiguration(invalid)).toThrow(InvalidConfigurationError);
  });
});

describe('brake configuration (RF11, RF18, CA-05, CA-23, TC-03)', () => {
  it('applies the default allowed commands to a v1 file without brake', () => {
    const config: ContextBrakeConfig = parseConfiguration(v1FileWithoutBrake());
    expect(config.brake.additionalAllowedCommands).toEqual([]);
  });
  it('rejects a turn ceiling that differs from the critical turn (RF11, CA-23)', () => {
    const invalid = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, turnCeiling: 11 } };
    expect(configurationIssues(invalid)).toContainEqual({ path: 'telemetry.turnCeiling', received: 11, rule: 'must equal telemetry.zones.criticalTurn' });
  });
  it('accepts trimmed commands without shell operators (RF18)', () => {
    const config = parseConfiguration(withAdditionalCommands(['npm run typecheck']));
    expect(config.brake.additionalAllowedCommands).toEqual(['npm run typecheck']);
  });
  it('rejects more than twenty additional allowed commands (RF11)', () => {
    const commands = Array.from({ length: 21 }, (_, index) => `command-${index}`);
    expect(configurationIssues(withAdditionalCommands(commands))).toContainEqual({ path: 'brake.additionalAllowedCommands', received: commands, rule: 'must have at most 20 entries' });
  });
  it('rejects duplicate additional allowed commands (RF11)', () => {
    const commands = ['npm test', 'npm test'];
    expect(configurationIssues(withAdditionalCommands(commands))).toContainEqual({ path: 'brake.additionalAllowedCommands', received: commands, rule: 'must not contain duplicates' });
  });
});

describe('additional allowed command shape (RF18, TC-03)', () => {
  it.each([' npm test', 'npm test '])('rejects the untrimmed command %s (RF18)', (command) => {
    expect(configurationIssues(withAdditionalCommands([command]))).toContainEqual({ path: 'brake.additionalAllowedCommands.0', received: command, rule: 'must not have leading or trailing whitespace' });
  });
  it.each(['', 'git status && rm -rf x', 'npm test; curl x', 'a & b', 'a | b', 'a `b`', 'echo $(x)', 'a < b', 'a > b', 'a\nb', 'a\rb'])('rejects the unsafe command %j (RF18)', (command) => {
    const issues = configurationIssues(withAdditionalCommands([command]));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe('brake.additionalAllowedCommands.0');
    expect(issues[0]?.received).toBe(command);
  });
});
