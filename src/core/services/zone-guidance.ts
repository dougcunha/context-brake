import type { SnapshotConfig } from '../contracts/configuration.js';
import { ZONES, type Zone } from '../contracts/zones.js';
import { SESSION_RESET_SIGNAL } from './reset-notice.js';

const RESUME_PREFIX = '[ContextBrake resume v1]';
const GENERIC_ACTIONS: Readonly<Record<Zone, string>> = {
  GREEN: 'work normally',
  YELLOW: 'keep working; finish the current unit before large new explorations',
  RED: 'finish or pause the current unit and tell the user what remains',
  CRITICAL: 'stop starting new work; tell the user what remains',
};

export function zoneAction(zone: Zone, snapshot: SnapshotConfig): string {
  const command = snapshot.command;
  if (command === undefined || zone === 'GREEN' || !isAtOrAbove(zone, snapshot.triggerZone)) return GENERIC_ACTIONS[zone];
  return zone === 'CRITICAL' ? `run "${command}" now, then end reply with ${SESSION_RESET_SIGNAL}` : `run "${command}", then end reply with ${SESSION_RESET_SIGNAL}`;
}
export function resumeText(snapshot: SnapshotConfig): string | null {
  return snapshot.resumeCommand === undefined ? null : `${RESUME_PREFIX} Run "${snapshot.resumeCommand}" before continuing.`;
}
function isAtOrAbove(zone: Zone, trigger: Zone): boolean {
  return ZONES.indexOf(zone) >= ZONES.indexOf(trigger);
}
