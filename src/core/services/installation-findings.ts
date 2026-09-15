import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { PlanConflict } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { ManagedAsset } from '../contracts/manifest.js';
import { hashString } from './change-plan-service.js';
import { renderProtocol } from './protocol-service.js';

export function conflictFindings(conflicts: readonly PlanConflict[]): DiagnosticFinding[] {
  return conflicts.map((c) => ({
    code: c.code,
    severity: 'error' as const,
    scope: 'file' as const,
    harness: null,
    path: c.path,
    message: c.detail,
    impact: 'This file could not be modified.',
    remediation: `Fix syntax or structure in ${c.path}.`,
  }));
}

export function buildManagedAssets(config: ContextBrakeConfig, configContent: string, adapterAssets: readonly ManagedAsset[]): ManagedAsset[] {
  return [
    { path: 'context-brake.config.json', kind: 'config', sha256: hashString(configContent) },
    { path: config.instructionFiles.protocolFile, kind: 'protocol', sha256: hashString(renderProtocol(config)) },
    ...adapterAssets,
  ];
}
