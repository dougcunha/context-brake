import type { ToolCall } from './runtime.js';
import type { UsageReading, Zone } from './zones.js';

export const CHECKPOINT_MODES = ['plan', 'delegated'] as const;
export type CheckpointMode = (typeof CHECKPOINT_MODES)[number];

export interface PlanPresence {
  exists(): Promise<boolean>;
}

export type DenyInput = {
  readonly tool: string;
  readonly turn: number;
  readonly usagePercentage: number;
  readonly usage: UsageReading;
};

export type ZoneGuidance = {
  readonly mode: CheckpointMode;
  actionFor(zone: Zone): string;
  allows(call: ToolCall): Promise<boolean>;
  denyMessage(input: DenyInput): string;
  failureMessage(tool: string): string;
  readonly resumeText: string | null;
};
