import type { ContextBrakeConfig, DelegatedSnapshotConfig } from '../contracts/configuration.js';
import type { ToolCall } from '../contracts/runtime.js';
import { ZONES, type Zone } from '../contracts/zones.js';
import { renderBlockHeader, renderFailureBlockHeader } from './block-message.js';
import { matchesAnyPathPattern } from './path-pattern.js';
import { SESSION_RESET_SIGNAL } from './reset-notice.js';
import { isAllowedShellCommand } from './shell-command-matcher.js';
import { ZONE_ACTIONS } from './zone-actions.js';
import type { DenyInput, ZoneGuidance } from '../contracts/checkpoint-mode.js';

const COMMAND_PREFIX = '/';
const BOOT_PREFIX = '[ContextBrake boot v1]';
const GIT_ACTIONS = 'git status, git add, git commit';

export function delegatedAction(command: string): string {
  return `run "${command}", then end reply with ${SESSION_RESET_SIGNAL}`;
}
export function delegatedGuidance(config: ContextBrakeConfig, section: DelegatedSnapshotConfig): ZoneGuidance {
  const skills = allowedSkillNames(section);
  const tail = `${allowedSummary(config, section, skills)} Run "${section.snapshotCommand}", then end reply with ${SESSION_RESET_SIGNAL}.`;
  return {
    mode: 'delegated',
    actionFor: (zone) => (isAtOrAbove(zone, section.triggerZone) ? delegatedAction(section.snapshotCommand) : ZONE_ACTIONS[zone].compact),
    allows: (call) => Promise.resolve(isDelegatedCallAllowed(call, { config, section, skills })),
    denyMessage: (input: DenyInput) => `${renderBlockHeader({ ...input, config })} ${tail}`,
    failureMessage: (tool) => `${renderFailureBlockHeader(tool)} ${tail}`,
    resumeText: section.resumeCommand === undefined ? null : `${BOOT_PREFIX} Run "${section.resumeCommand}" before continuing.`,
  };
}
type DelegatedAllowlist = { readonly config: ContextBrakeConfig; readonly section: DelegatedSnapshotConfig; readonly skills: ReadonlySet<string> };
export function isDelegatedCallAllowed(call: ToolCall, allowlist: DelegatedAllowlist): boolean {
  switch (call.category) {
    case 'file_read':
    case 'file_write':
      return call.paths.length > 0 && call.paths.every((path) => matchesAnyPathPattern(path, allowlist.section.allowedPaths));
    case 'skill':
      return call.skill !== undefined && allowlist.skills.has(call.skill);
    case 'shell':
      return call.command !== null && isAllowedShellCommand(call.command, { validationCommand: null, additionalCommands: allowlist.config.brake.additionalAllowedCommands });
    case 'other':
      return false;
  }
}
export function allowedSkillNames(section: DelegatedSnapshotConfig): ReadonlySet<string> {
  const derived = [section.snapshotCommand, section.resumeCommand].flatMap((command) => leadingSkill(command));
  return new Set([...section.allowedSkills, ...derived]);
}
function leadingSkill(command: string | undefined): string[] {
  const token = command?.split(/\s+/)[0] ?? '';
  return token.startsWith(COMMAND_PREFIX) && token.length > COMMAND_PREFIX.length ? [token.slice(COMMAND_PREFIX.length)] : [];
}
function allowedSummary(config: ContextBrakeConfig, section: DelegatedSnapshotConfig, skills: ReadonlySet<string>): string {
  const parts = [
    ...(section.allowedPaths.length > 0 ? [`read or write ${section.allowedPaths.join(', ')}`] : []),
    ...(skills.size > 0 ? [`skill ${[...skills].join(', ')}`] : []),
    GIT_ACTIONS,
    ...config.brake.additionalAllowedCommands,
  ];
  return `Allowed: ${parts.join(', ')}.`;
}
function isAtOrAbove(zone: Zone, trigger: Zone): boolean {
  return ZONES.indexOf(zone) >= ZONES.indexOf(trigger);
}
