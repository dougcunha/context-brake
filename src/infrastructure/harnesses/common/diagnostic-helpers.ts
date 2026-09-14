import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import type { HarnessId } from '../../../core/contracts/harness.js';

export function createIntegrationMissingFinding(harness: HarnessId, path: string): DiagnosticFinding {
  return {
    code: 'INTEGRATION_MISSING',
    severity: 'error',
    scope: 'harness',
    harness,
    path,
    message: `The ${harness} integration is missing from ${path}.`,
    impact: 'ContextBrake cannot stop or annotate tool calls in this harness.',
    remediation: `Run context-brake init --harness ${harness} --yes.`,
  };
}

export function createAssetMissingFinding(harness: HarnessId, path: string): DiagnosticFinding {
  return {
    code: 'ASSET_MISSING',
    severity: 'error',
    scope: 'harness',
    harness,
    path,
    message: `The runtime asset ${path} for ${harness} is missing.`,
    impact: 'The harness cannot execute the ContextBrake hook or plugin.',
    remediation: `Run context-brake init --harness ${harness} --yes.`,
  };
}

export function createInvalidConfigFinding(harness: HarnessId, path: string, detail: string): DiagnosticFinding {
  return {
    code: 'INVALID_HARNESS_CONFIG',
    severity: 'error',
    scope: 'file',
    harness,
    path,
    message: `Configuration file ${path} for ${harness} is invalid: ${detail}`,
    impact: 'ContextBrake cannot safely read or modify this configuration.',
    remediation: `Fix syntax or structure errors in ${path}.`,
  };
}

export function createLimitationFinding(
  harness: HarnessId,
  code: string,
  impact: string
): DiagnosticFinding {
  return {
    code,
    severity: 'warning',
    scope: 'harness',
    harness,
    path: null,
    message: `Harness ${harness} has an active limitation.`,
    impact,
    remediation: null,
  };
}
