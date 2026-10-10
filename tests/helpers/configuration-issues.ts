import { InvalidConfigurationError, parseConfiguration, type ConfigurationIssue } from '../../src/core/validation/configuration-validator.js';

export function configurationError(input: unknown): InvalidConfigurationError | null {
  try {
    parseConfiguration(input);
  } catch (error) {
    if (error instanceof InvalidConfigurationError) return error;
    throw error;
  }
  return null;
}

export function configurationIssues(input: unknown): ConfigurationIssue[] {
  return configurationError(input)?.issues ?? [];
}
