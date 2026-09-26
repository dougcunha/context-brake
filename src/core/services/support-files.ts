import type { FileSnapshot, PlanConflict, PlannedChange } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { InstallationManifest } from '../contracts/manifest.js';
import { planGitignoreInstall, planGitignoreRemoval } from './gitignore-service.js';
import { planInstructionChanges } from './instruction-service.js';
import { planProtocolChange } from './protocol-service.js';
import { planInstructionRemoval } from './removal-helper.js';

export type SupportFilesInput = {
  readonly instructionSnapshots: readonly FileSnapshot[];
  readonly protocolSnapshot: FileSnapshot;
  readonly gitignoreSnapshot: FileSnapshot;
  readonly allSnapshots: readonly FileSnapshot[];
  readonly previousManifest?: InstallationManifest | null | undefined;
  readonly createInstructions?: boolean | undefined;
  readonly migrateLegacy?: boolean | undefined;
};
export type SupportFilesPlan = {
  readonly changes: readonly PlannedChange[];
  readonly protocolChanges: readonly PlannedChange[];
  readonly conflicts: readonly PlanConflict[];
  readonly legacyDetected: readonly string[];
  readonly findings: readonly DiagnosticFinding[];
};
type ProtocolPlan = Pick<SupportFilesPlan, 'protocolChanges' | 'findings'>;

export function planSupportFiles(input: SupportFilesInput, config: ContextBrakeConfig): SupportFilesPlan {
  return config.lightMode === undefined ? planFullSupport(input, config) : planLightSupport(input, config);
}
function planFullSupport(input: SupportFilesInput, config: ContextBrakeConfig): SupportFilesPlan {
  const proto = planProtocolChange(config, input.protocolSnapshot, Boolean(input.previousManifest?.assets.some((a) => a.kind === 'protocol')));
  const inst = planInstructionChanges({ snapshots: input.instructionSnapshots, config, createInstructions: input.createInstructions, migrateLegacy: input.migrateLegacy });
  const gi = planGitignoreInstall({ snapshot: input.gitignoreSnapshot, config });
  return {
    changes: [...inst.changes, ...gi.changes], protocolChanges: proto.change ? [proto.change] : [],
    conflicts: [...inst.conflicts, ...gi.conflicts, ...(proto.conflict ? [proto.conflict] : [])], legacyDetected: inst.legacyDetected, findings: [],
  };
}
function planLightSupport(input: SupportFilesInput, config: ContextBrakeConfig): SupportFilesPlan {
  const gitignore = hasStateFiles(input, config) ? { changes: [], conflicts: [] } : planGitignoreRemoval({ snapshot: input.gitignoreSnapshot, removeState: true });
  return { changes: [...planInstructionRemoval(input.instructionSnapshots), ...gitignore.changes], conflicts: gitignore.conflicts, legacyDetected: [], ...planProtocolRemoval(input) };
}
function hasStateFiles(input: SupportFilesInput, config: ContextBrakeConfig): boolean {
  const statePaths = [config.stateStorage.planFile, config.stateStorage.checkpointFile];
  return input.allSnapshots.some((snapshot) => statePaths.includes(snapshot.path) && snapshot.exists);
}
function planProtocolRemoval(input: SupportFilesInput): ProtocolPlan {
  const asset = input.previousManifest?.assets.find((entry) => entry.kind === 'protocol');
  const snapshot = asset === undefined ? undefined : input.allSnapshots.find((entry) => entry.path === asset.path);
  if (asset === undefined || snapshot === undefined || !snapshot.exists) return { protocolChanges: [], findings: [] };
  if (snapshot.sha256 !== asset.sha256) return { protocolChanges: [], findings: [keptProtocolFinding(asset.path)] };
  const change: PlannedChange = { path: snapshot.path, realPath: snapshot.realPath, kind: 'delete', owner: 'protocol', content: null, preview: { summary: 'Delete the protocol file, which the light mode does not use' } };
  return { protocolChanges: [change], findings: [] };
}
function keptProtocolFinding(path: string): DiagnosticFinding {
  return {
    code: 'LIGHT_MODE_ASSET_KEPT', severity: 'warning', scope: 'file', harness: null, path,
    message: `The protocol file ${path} changed since installation, so the light mode keeps it.`,
    impact: 'Agents that read this file still see the full-mode protocol.',
    remediation: `Delete or move ${path} before running context-brake init --no-light, because ContextBrake no longer manages it; keep it only if the project still needs it.`,
  };
}
