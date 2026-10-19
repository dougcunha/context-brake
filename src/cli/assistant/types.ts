import type { HarnessAdapter } from '../../core/contracts/adapter.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { HarnessDetection, HarnessId } from '../../core/contracts/harness.js';
import type { SkillCatalogReader } from '../../core/contracts/skill-catalog.js';
import type { SkillInvocationResolver } from '../../core/contracts/skill-invocation.js';
import type { ContextSource } from '../../infrastructure/harnesses/claude-code/context-source.js';
import type { HarnessRestartMode } from '../../core/services/restart-install-extras.js';

export type AssistantContext = {
  readonly config: ContextBrakeConfig | null;
  readonly detections: readonly HarnessDetection[];
  readonly adapters: readonly HarnessAdapter[];
  readonly hasStatuslineOptOut: boolean;
  readonly contextSource: ContextSource;
  readonly insideGit: boolean;
  readonly invocations: SkillInvocationResolver;
  readonly projectRoot: string;
  readonly catalog: SkillCatalogReader;
};

export type HarnessInvocationFact = { readonly harness: HarnessId; readonly command: string; readonly resumeCommand: string | null };
export type HarnessRestartFact = { readonly harness: HarnessId; readonly mode: HarnessRestartMode };
export type AssistantFacts = {
  readonly selected: readonly HarnessId[];
  readonly excluded: readonly HarnessId[];
  readonly snapshotCommand: string | null;
  readonly triggerZone: string;
  readonly triggerPercentage: number | null;
  readonly resumeCommand: string | null;
  readonly invocations: readonly HarnessInvocationFact[];
  readonly restartOn: boolean;
  readonly restartLimit: number | null;
  readonly restartModes: readonly HarnessRestartFact[];
  readonly statuslineBridge: boolean | null;
  readonly contextSource: ContextSource | null;
  readonly debug: boolean;
  readonly gitIgnore: boolean | null;
};

export type AssistantResult = { readonly flags: readonly string[]; readonly facts: AssistantFacts };
export type Validation<T> = { readonly value: T } | { readonly error: string };
