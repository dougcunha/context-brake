import type { PlanConflict } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { ManagedAsset } from '../contracts/manifest.js';
import { hashString } from './change-plan-service.js';

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

export function buildManagedAssets(configContent: string, adapterAssets: readonly ManagedAsset[]): ManagedAsset[] {
  return [
    { path: 'context-brake.config.json', kind: 'config', sha256: hashString(configContent) },
    ...adapterAssets,
  ];
}
