import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { FileSnapshot } from '../contracts/changes.js';
import { renderReferenceBlock } from './instruction-markers.js';
import { planInstructionChanges } from './instruction-service.js';

export function legacyFinding(path: string, config: ContextBrakeConfig): DiagnosticFinding {
  const block = renderReferenceBlock(config.stateStorage.planFile, config.instructionFiles.protocolFile, '\n');
  return {
    code: 'LEGACY_BLOCK_DETECTED',
    severity: 'warning',
    scope: 'file',
    harness: null,
    path,
    message: `Legacy CONTEXTOPS block detected in ${path}.`,
    impact: `The proposed migration replaces it with:\n${block}\nUnmatched user text outside the protocol is preserved.`,
    remediation: 'Run context-brake init --migrate-legacy to replace the legacy block.',
  };
}

export function detectLegacyFindings(snapshots: readonly FileSnapshot[], config: ContextBrakeConfig): DiagnosticFinding[] {
  const { legacyDetected, conflicts } = planInstructionChanges({ snapshots, config, migrateLegacy: false });
  return [
    ...legacyDetected.map((path) => legacyFinding(path, config)),
    ...conflicts.map((conflict) => ({
      code: conflict.code,
      severity: 'error' as const,
      scope: 'file' as const,
      harness: null,
      path: conflict.path,
      message: conflict.detail,
      impact: 'The instruction file markers could not be analyzed.',
      remediation: `Fix the CONTEXTOPS markers in ${conflict.path}.`,
    })),
  ];
}
