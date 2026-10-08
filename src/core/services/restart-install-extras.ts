import type { HarnessAdapter } from '../contracts/adapter.js';
import type { FileSnapshot, PlannedChange } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { CapabilityProfile, HarnessDetection } from '../contracts/harness.js';
import type { InstallationManifest, ManagedAsset } from '../contracts/manifest.js';
import { hashString } from './change-plan-service.js';
import { planRuntimeStateDeletions } from './removal-helper.js';

export const HANDOFF_IGNORE_PATH = '.context-brake/.gitignore';
export const HANDOFF_IGNORE_CONTENT = 'handoff.md\nhandoffs/\n';
const SEMI_AUTOMATIC_PREFIX = 'Semi-automatic restart';

export type HarnessRestartMode = 'automatic' | 'semi-automatic' | 'not available';
export type RestartExtrasInput = {
  readonly wanted: boolean;
  readonly adapters: readonly HarnessAdapter[];
  readonly active: readonly HarnessDetection[];
  readonly snapshot: FileSnapshot | undefined;
  readonly logs: readonly FileSnapshot[];
  readonly previousManifest: InstallationManifest | null;
};
export type RestartExtras = { readonly changes: readonly PlannedChange[]; readonly assets: readonly ManagedAsset[]; readonly findings: readonly DiagnosticFinding[] };

export function harnessRestartMode(profile: CapabilityProfile): { readonly mode: HarnessRestartMode; readonly reason: string } {
  const state = profile.capabilities.find((capability) => capability.id === 'auto_restart')?.state;
  const impact = profile.limitations.find((limitation) => limitation.capability === 'auto_restart')?.impact ?? '';
  if (state !== undefined && state !== 'unsupported') return { mode: 'automatic', reason: impact === '' ? 'Automatic restart: a valid reset signal opens a new session by itself.' : impact };
  return impact.startsWith(SEMI_AUTOMATIC_PREFIX) ? { mode: 'semi-automatic', reason: impact } : { mode: 'not available', reason: impact };
}

function modeFinding(adapter: HarnessAdapter): DiagnosticFinding {
  const { mode, reason } = harnessRestartMode(adapter.capabilityProfile());
  return { code: 'AUTO_RESTART_MODE', severity: 'ok', scope: 'harness', harness: adapter.id, path: null, message: `Restart is ${mode} on ${adapter.id}.`, impact: reason, remediation: null };
}

function ignoreChange(input: RestartExtrasInput): PlannedChange | null {
  const snapshot = input.snapshot;
  if (snapshot === undefined) return null;
  if (input.wanted) return { path: HANDOFF_IGNORE_PATH, realPath: snapshot.realPath, kind: 'create', owner: 'runtime_asset', content: HANDOFF_IGNORE_CONTENT, preview: { summary: 'Keep the session handoffs out of Git' } };
  const recorded = input.previousManifest?.assets.find((asset) => asset.path === HANDOFF_IGNORE_PATH);
  if (!snapshot.exists || recorded === undefined || snapshot.sha256 !== recorded.sha256) return null;
  return { path: HANDOFF_IGNORE_PATH, realPath: snapshot.realPath, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete the handoff ignore file' } };
}

export function planRestartExtras(input: RestartExtrasInput): RestartExtras {
  const change = ignoreChange(input);
  const adapters = input.active.flatMap((detection) => input.adapters.filter((adapter) => adapter.id === detection.harness));
  return {
    changes: [...(change === null ? [] : [change]), ...(input.wanted ? [] : planRuntimeStateDeletions(input.logs))],
    assets: change?.kind === 'create' ? [{ path: HANDOFF_IGNORE_PATH, kind: 'runtime_asset', sha256: hashString(HANDOFF_IGNORE_CONTENT) }] : [],
    findings: input.wanted ? adapters.map(modeFinding) : [],
  };
}

export function hasRestartMode(adapters: readonly HarnessAdapter[], active: readonly HarnessDetection[]): boolean {
  return active.some((detection) => adapters.some((adapter) => adapter.id === detection.harness && harnessRestartMode(adapter.capabilityProfile()).mode !== 'not available'));
}
