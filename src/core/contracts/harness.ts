import { z } from 'zod';

export const HARNESS_IDS = [
  'claude-code',
  'codex-cli',
  'cursor',
  'github-copilot-cli',
  'opencode',
  'pi',
  'oh-my-pi',
  'antigravity-cli',
] as const;
export const DETECTION_ORIGINS = ['project', 'machine'] as const;
export const DETECTION_STATES = ['project', 'candidate', 'excluded'] as const;
export const SUPPORT_LEVELS = ['full', 'partial', 'cooperative'] as const;
export const CAPABILITY_STATES = ['supported', 'unsupported', 'unknown'] as const;
export const CAPABILITY_IDS = [
  'pre_tool_block',
  'post_tool_telemetry',
  'session_boot',
  'context_usage',
  'timeout_fail_closed',
] as const;
export const VERSION_STATUSES = ['resolved', 'old', 'unknown', 'malformed', 'timed_out'] as const;
export const VERSION_SOURCES = ['executable', 'config'] as const;
export const SHARED_INSTRUCTION_EVIDENCE = 'shared_instruction';

export type HarnessId = (typeof HARNESS_IDS)[number];
export type CapabilityId = (typeof CAPABILITY_IDS)[number];
export type CapabilityState = (typeof CAPABILITY_STATES)[number];
export type SupportLevel = (typeof SUPPORT_LEVELS)[number];
export type DetectionOrigin = (typeof DETECTION_ORIGINS)[number];
export type DetectionState = (typeof DETECTION_STATES)[number];
export type VersionStatus = (typeof VERSION_STATUSES)[number];
export type VersionSource = (typeof VERSION_SOURCES)[number];

export type DetectionEvidence = { origin: DetectionOrigin; kind: string; value: string };
export type HarnessDetection = { harness: HarnessId; state: DetectionState; evidence: readonly DetectionEvidence[]; selectedExplicitly: boolean; version: string | null; versionSource: VersionSource | null };
export type VersionProbe = { status: VersionStatus; display: string | null; normalized: string | null; source: VersionSource; minimumVersion: string | null };
export type CapabilityDefinition = { id: CapabilityId; state: CapabilityState; impact?: string };
export type CapabilityStatus = { id: CapabilityId; state: CapabilityState };
export type CapabilityLimitation = { capability: CapabilityId; impact: string };
export type CapabilityProfile = { harness: HarnessId; supportLevel: SupportLevel; minimumVersion: string | null; capabilities: readonly CapabilityStatus[]; limitations: readonly CapabilityLimitation[] };
export type SupportInput = { harness: HarnessId; capabilities: readonly CapabilityDefinition[]; version?: VersionProbe | undefined };
export type DetectionInput = { project: readonly DetectionEvidence[]; machine?: readonly DetectionEvidence[] | undefined; version?: VersionProbe | undefined };
export type DetectionSources = Readonly<Record<HarnessId, DetectionInput>>;
export type DetectionSelection = { include?: readonly HarnessId[]; exclude?: readonly HarnessId[] };

export const harnessIdSchema = z.enum(HARNESS_IDS);
export const capabilityIdSchema = z.enum(CAPABILITY_IDS);
export const capabilityStateSchema = z.enum(CAPABILITY_STATES);
export const detectionEvidenceSchema = z.object({ origin: z.enum(DETECTION_ORIGINS), kind: z.string().min(1), value: z.string().min(1) }).strict();
export const versionProbeSchema = z.object({ status: z.enum(VERSION_STATUSES), display: z.string().nullable(), normalized: z.string().nullable(), source: z.enum(VERSION_SOURCES), minimumVersion: z.string().nullable() }).strict();
export type { HarnessAdapter, AdapterPlan, BenchmarkFixture, HarnessContext, AdapterDescriptor } from './adapter.js';

