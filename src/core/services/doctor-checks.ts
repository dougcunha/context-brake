import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import { InvalidConfigurationError } from '../validation/configuration-validator.js';
import { checkLegacyTurnLimits } from './config-legacy-checks.js';

const INVALID_CONFIG_REMEDIATION = 'Fix syntax or structure in context-brake.config.json.';

function configRemediation(error: Error): string {
  return error instanceof InvalidConfigurationError && error.remediation !== null ? error.remediation : INVALID_CONFIG_REMEDIATION;
}

export function checkConfig(config: ContextBrakeConfig | null, error?: Error | null): { effective: ContextBrakeConfig; findings: DiagnosticFinding[] } {
  if (error) {
    const finding: DiagnosticFinding = {
      code: 'INVALID_CONTEXTBRAKE_CONFIG', severity: 'error', scope: 'project', harness: null, path: 'context-brake.config.json',
      message: error.message, impact: 'Configuration values are invalid and ContextBrake cannot safely operate with them.', remediation: configRemediation(error),
    };
    return { effective: DEFAULT_CONFIG, findings: [finding] };
  }
  if (!config) {
    const finding: DiagnosticFinding = {
      code: 'CONFIG_MISSING', severity: 'warning', scope: 'project', harness: null, path: 'context-brake.config.json',
      message: 'Configuration file context-brake.config.json is missing.', impact: 'Default configuration values are used for diagnostics.', remediation: 'Run context-brake init --yes.',
    };
    return { effective: DEFAULT_CONFIG, findings: [finding] };
  }
  return { effective: config, findings: checkLegacyTurnLimits(config) };
}

