import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { FileSnapshot } from '../contracts/changes.js';
import type { TaskPlan } from '../contracts/task-plan.js';
import type { StateCheckpoint } from '../contracts/state-checkpoint.js';
import { parseTaskPlan } from '../validation/plan-validator.js';
import { checkpointAgainstPlanIssues, parseStateCheckpoint } from '../validation/checkpoint-validator.js';
import { checkLegacyTurnLimits } from './config-legacy-checks.js';
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
  return { effective: config, findings: checkLegacyTurnLimits(config) };
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

function validateSnapshot(snap: FileSnapshot, parse: (val: unknown) => void): DiagnosticFinding[] {
  if (!snap.exists || !snap.content) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(snap.content);
  } catch {
    return [{
      code: 'INVALID_STATE_FILE', severity: 'error', scope: 'file', harness: null, path: snap.path,
      message: `State file ${snap.path} contains invalid JSON.`, impact: 'Harnesses cannot safely read state.', remediation: `Fix syntax errors in ${snap.path}.`,
    }];
  }
  try {
    parse(parsed);
    return [];
  } catch (err) {
    const issues = (err as { issues?: { path: string; rule: string }[] }).issues ?? [];
    return issues.map((i) => ({
      code: 'INVALID_STATE_FILE', severity: 'error', scope: 'file', harness: null, path: snap.path,
      message: `State file ${snap.path} is invalid: ${i.path} ${i.rule}.`, impact: 'Harnesses cannot safely read state.', remediation: `Fix ${i.path} in ${snap.path}.`,
    }));
  }
}

export function checkStateFiles(plan?: FileSnapshot, checkpoint?: FileSnapshot): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  let validPlan: TaskPlan | null = null;
  let validCheckpoint: StateCheckpoint | null = null;
  if (plan) findings.push(...validateSnapshot(plan, (input) => { validPlan = parseTaskPlan(input, plan.path); }));
  if (checkpoint) findings.push(...validateSnapshot(checkpoint, (input) => { validCheckpoint = parseStateCheckpoint(input, checkpoint.path); }));
  if (validPlan && validCheckpoint && checkpoint) {
    const cross = checkpointAgainstPlanIssues(validCheckpoint, validPlan);
    for (const i of cross) {
      findings.push({
        code: 'INVALID_STATE_FILE', severity: 'error', scope: 'file', harness: null, path: checkpoint.path,
        message: `State file ${checkpoint.path} is invalid: ${i.path} ${i.rule}.`, impact: 'Harnesses cannot safely read state.', remediation: `Fix ${i.path} in ${checkpoint.path}.`,
      });
    }
  }
  return findings;
}
