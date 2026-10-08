import type { HarnessAdapter } from '../../core/contracts/adapter.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { HarnessDetection, HarnessId } from '../../core/contracts/harness.js';
import type { HarnessRestartMode } from '../../core/services/restart-install-extras.js';

export type AssistantContext = {
  readonly config: ContextBrakeConfig | null;
  readonly detections: readonly HarnessDetection[];
  readonly adapters: readonly HarnessAdapter[];
  readonly hasStatuslineOptOut: boolean;
};

export type HarnessRestartFact = { readonly harness: HarnessId; readonly mode: HarnessRestartMode };
export type AssistantFacts = {
  readonly selected: readonly HarnessId[];
  readonly excluded: readonly HarnessId[];
  readonly snapshotCommand: string | null;
  readonly triggerZone: string;
  readonly resumeCommand: string | null;
  readonly restartOn: boolean;
  readonly restartLimit: number | null;
  readonly restartModes: readonly HarnessRestartFact[];
  readonly statuslineBridge: boolean | null;
  readonly debug: boolean;
};

export type AssistantResult = { readonly flags: readonly string[]; readonly facts: AssistantFacts };
export type Validation<T> = { readonly value: T } | { readonly error: string };
