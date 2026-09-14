import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError, parseConfiguration } from '../../src/core/validation/configuration-validator.js';

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
