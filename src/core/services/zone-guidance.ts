import type { SnapshotConfig } from '../contracts/configuration.js';
import { ZONES, type Zone } from '../contracts/zones.js';
import { SESSION_RESET_SIGNAL } from './reset-notice.js';
import type { RestartMode } from './restart-mode.js';

const RESUME_PREFIX = '[ContextBrake resume v1]';
const HANDOFF_PATH = '.context-brake/handoff.md';
const GENERIC_ACTIONS: Readonly<Record<Zone, string>> = {
  GREEN: 'work normally',
  YELLOW: 'keep working; finish the current unit before large new explorations',
  RED: 'finish or pause the current unit and tell the user what remains',
  CRITICAL: 'stop starting new work; tell the user what remains',
};

export function zoneAction(zone: Zone, snapshot: SnapshotConfig, mode: RestartMode = 'off'): string {
  if (zone === 'GREEN' || !isAtOrAbove(zone, snapshot.triggerZone)) return GENERIC_ACTIONS[zone];
  if (snapshot.command !== undefined) return snapshotAction(zone, snapshot.command);
  if (mode !== 'handoff') return GENERIC_ACTIONS[zone];
  return `save handoff to ${HANDOFF_PATH}, end reply with ${SESSION_RESET_SIGNAL}`;
}
function snapshotAction(zone: Zone, command: string): string {
  const now = zone === 'CRITICAL' ? ' now' : '';
  return `run "${command}"${now}, then end reply with ${SESSION_RESET_SIGNAL}`;
}
export function handoffResumeText(archivedPath: string): string {
  return `${RESUME_PREFIX} Read "${archivedPath}" and continue the previous work from it.`;
}
export function resumeText(snapshot: SnapshotConfig): string | null {
  return snapshot.resumeCommand === undefined ? null : `${RESUME_PREFIX} Run "${snapshot.resumeCommand}" before continuing.`;
}
function isAtOrAbove(zone: Zone, trigger: Zone): boolean {
  return ZONES.indexOf(zone) >= ZONES.indexOf(trigger);
}
