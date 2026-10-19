import type { SnapshotConfig } from '../contracts/configuration.js';
import type { SkillInvocationFormat } from '../contracts/skill-invocation.js';
import { ZONES, type Zone } from '../contracts/zones.js';
import { SESSION_RESET_SIGNAL } from './reset-notice.js';
import type { RestartMode } from './restart-mode.js';
import { sentenceInvocation } from './skill-invocation.js';

const RESUME_PREFIX = '[ContextBrake resume v1]';
const HANDOFF_PATH = '.context-brake/handoff.md';
const GENERIC_ACTIONS: Readonly<Record<Zone, string>> = {
  GREEN: 'work normally',
  YELLOW: 'keep working; finish the current unit before large new explorations',
  RED: 'finish or pause the current unit and tell the user what remains',
  CRITICAL: 'stop starting new work; tell the user what remains',
};

export type GuidanceOptions = { readonly mode?: RestartMode | undefined; readonly invoke?: SkillInvocationFormat | undefined; readonly usagePercentage?: number | undefined };
export type ZoneUsage = { readonly zone: Zone; readonly usagePercentage: number };

export function isResetDue(reading: ZoneUsage, snapshot: SnapshotConfig): boolean {
  if (snapshot.triggerPercentage !== undefined) return reading.usagePercentage >= snapshot.triggerPercentage;
  return reading.zone !== 'GREEN' && isAtOrAbove(reading.zone, snapshot.triggerZone);
}
export function zoneAction(zone: Zone, snapshot: SnapshotConfig, options: GuidanceOptions = {}): string {
  if (!isResetDue({ zone, usagePercentage: options.usagePercentage ?? 0 }, snapshot)) return GENERIC_ACTIONS[zone];
  if (snapshot.command !== undefined) return snapshotAction(zone, (options.invoke ?? sentenceInvocation)(snapshot.command));
  if ((options.mode ?? 'off') !== 'handoff') return GENERIC_ACTIONS[zone];
  return `save handoff to ${HANDOFF_PATH}, end reply with ${SESSION_RESET_SIGNAL}`;
}
function snapshotAction(zone: Zone, invocation: string): string {
  const now = zone === 'CRITICAL' ? ' now' : '';
  return `run "${invocation}"${now}, then end reply with ${SESSION_RESET_SIGNAL}`;
}
export function handoffResumeText(archivedPath: string): string {
  return `${RESUME_PREFIX} Read "${archivedPath}" and continue the previous work from it.`;
}
export function resumeText(snapshot: SnapshotConfig, invoke: SkillInvocationFormat = sentenceInvocation): string | null {
  return snapshot.resumeCommand === undefined ? null : `${RESUME_PREFIX} Run "${invoke(snapshot.resumeCommand)}" before continuing.`;
}
function isAtOrAbove(zone: Zone, trigger: Zone): boolean {
  return ZONES.indexOf(zone) >= ZONES.indexOf(trigger);
}
