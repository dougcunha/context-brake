import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { FileSnapshot } from '../contracts/changes.js';
import { CURRENT_START_MARKER } from './instruction-markers.js';
import { renderProtocol } from './protocol-service.js';

export function checkConfig(config: ContextBrakeConfig | null, error?: Error | null): { effective: ContextBrakeConfig; findings: DiagnosticFinding[] } {
  if (error) {
    const finding: DiagnosticFinding = {
      code: 'INVALID_CONTEXTBRAKE_CONFIG', severity: 'error', scope: 'project', harness: null, path: 'context-brake.config.json',
      message: error.message, impact: 'Configuration values are invalid and ContextBrake cannot safely operate with them.', remediation: 'Fix syntax or structure in context-brake.config.json.',
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
  return { effective: config, findings: [] };
}

export function checkInstructionFiles(targets: readonly FileSnapshot[]): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  for (const target of targets) {
    if (!target.exists) continue;
    if (!target.content?.includes(CURRENT_START_MARKER)) {
      findings.push({
        code: 'INSTRUCTION_REFERENCE_MISSING', severity: 'warning', scope: 'file', harness: null, path: target.path,
        message: `ContextBrake reference block is missing in ${target.path}.`, impact: null, remediation: 'Run context-brake init --yes.',
      });
    }
  }
  return findings;
}

export function checkProtocolFile(snapshot: FileSnapshot, config: ContextBrakeConfig): DiagnosticFinding[] {
  if (!snapshot.exists) {
    return [{
      code: 'PROTOCOL_FILE_MISSING', severity: 'error', scope: 'file', harness: null, path: snapshot.path,
      message: `Protocol file ${snapshot.path} is missing.`, impact: 'Agents cannot read the ContextBrake protocol.', remediation: 'Run context-brake init --yes.',
    }];
  }
  if (snapshot.content !== renderProtocol(config)) {
    return [{
      code: 'PROTOCOL_FILE_MISMATCH', severity: 'warning', scope: 'file', harness: null, path: snapshot.path,
      message: `Protocol file ${snapshot.path} does not match current configuration.`, impact: null, remediation: 'Run context-brake init --yes to update protocol.',
    }];
  }
  return [];
}

export function checkStateFiles(plan?: FileSnapshot, checkpoint?: FileSnapshot): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  for (const snap of [plan, checkpoint]) {
    if (!snap?.exists || !snap.content) continue;
    try {
      JSON.parse(snap.content);
    } catch {
      findings.push({
        code: 'INVALID_STATE_FILE', severity: 'error', scope: 'file', harness: null, path: snap.path,
        message: `State file ${snap.path} contains invalid JSON.`, impact: 'Harnesses cannot safely read state.', remediation: `Fix syntax errors in ${snap.path}.`,
      });
    }
  }
  return findings;
}
