import type { FileSnapshot } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { InstallationManifest } from '../contracts/manifest.js';
import { checkInstructionFiles, checkProtocolFile, checkStateFiles } from './doctor-checks.js';
import { checkGitignore } from './gitignore-checks.js';
import { CURRENT_START_MARKER } from './instruction-markers.js';

export type ProjectFileInput = {
  readonly config: ContextBrakeConfig | null;
  readonly configError?: Error | null | undefined;
  readonly instructionSnapshots: readonly FileSnapshot[];
  readonly protocolSnapshot: FileSnapshot;
  readonly gitignoreSnapshot: FileSnapshot;
  readonly planSnapshot?: FileSnapshot | undefined;
  readonly checkpointSnapshot?: FileSnapshot | undefined;
  readonly manifest: InstallationManifest | null;
};

const LEFTOVER_REMEDIATION = 'Run context-brake init --yes.';

export function projectFileFindings(input: ProjectFileInput, effective: ContextBrakeConfig): DiagnosticFinding[] {
  if (effective.lightMode !== undefined) return lightLeftoverFindings(input);
  return [
    ...checkInstructionFiles(input.instructionSnapshots),
    ...checkProtocolFile(input.protocolSnapshot, effective),
    ...checkStateFiles(input.planSnapshot, input.checkpointSnapshot),
    ...(input.config && !input.configError ? checkGitignore(input.gitignoreSnapshot, input.config) : []),
  ];
}
function lightLeftoverFindings(input: ProjectFileInput): DiagnosticFinding[] {
  const blocks = input.instructionSnapshots.filter((snapshot) => snapshot.exists && snapshot.content?.includes(CURRENT_START_MARKER));
  const protocol = input.manifest?.assets.find((asset) => asset.kind === 'protocol');
  return [
    ...blocks.map((snapshot) => leftoverFinding(snapshot.path, `The ContextBrake reference block in ${snapshot.path} is left over; the light mode does not use it.`)),
    ...(protocol === undefined ? [] : [leftoverFinding(protocol.path, `The manifest still lists the protocol file ${protocol.path}; the light mode does not use it.`)]),
  ];
}
function leftoverFinding(path: string, message: string): DiagnosticFinding {
  return { code: 'LIGHT_MODE_LEFTOVER', severity: 'warning', scope: 'file', harness: null, path, message, impact: 'Agents can still follow the full-mode protocol in this repository.', remediation: LEFTOVER_REMEDIATION };
}
