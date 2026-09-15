import type { PlannedChange, PlanConflict } from './changes.js';
import type { DiagnosticFinding } from './diagnostics.js';
import type {
  CapabilityProfile,
  DetectionEvidence,
  HarnessId,
  VersionProbe,
} from './harness.js';
import type { InstallationManifest, ManagedAsset, ManagedEntry } from './manifest.js';
import type { ProcessRunner } from './processes.js';

export type HarnessContext = {
  readonly projectRoot: string;
  readonly runner?: ProcessRunner;
  readonly userHome?: string;
  readonly manifest?: InstallationManifest | null;
};

export type AdapterPlan = {
  readonly harness: HarnessId;
  readonly changes: readonly PlannedChange[];
  readonly conflicts: readonly PlanConflict[];
  readonly entries: readonly ManagedEntry[];
  readonly assets?: readonly ManagedAsset[];
  readonly assetPaths?: readonly string[];
};

export type BenchmarkFixture = {
  readonly harness: HarnessId;
  readonly executionModel: 'process' | 'in_process';
  readonly event: string;
  readonly targetMilliseconds: 100 | 15;
  readonly samplePayload: unknown;
};

export interface HarnessAdapter {
  readonly id: HarnessId;
  readonly executionModel: 'process' | 'in_process';
  capabilityProfile(version?: VersionProbe): CapabilityProfile;
  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]>;
  probeVersion(context: HarnessContext): Promise<VersionProbe>;
  planInstall(context: HarnessContext): Promise<AdapterPlan>;
  planRemove(context: HarnessContext): Promise<AdapterPlan>;
  diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]>;
  benchmarkFixture(): BenchmarkFixture;
}

export type AdapterDescriptor = {
  readonly id: HarnessId;
  readonly executionModel: 'process' | 'in_process';
  readonly strongProjectFiles: readonly string[];
  readonly machineExecutables: readonly string[];
  readonly userConfigFiles?: readonly string[];
  readonly createAdapter: () => HarnessAdapter;
};
