import type { ContextBrakeConfig, DelegatedSnapshotConfig } from '../contracts/configuration.js';
import { allowedSkillNames, delegatedAction } from './delegated-guidance.js';
import { SESSION_RESET_SIGNAL } from './reset-notice.js';

const GIT_COMMANDS = ['git status', 'git add', 'git commit'];

export function renderDelegatedProtocol(config: ContextBrakeConfig): string[] {
  const section = config.delegatedSnapshot;
  if (section === undefined) return [];
  const { planFile, checkpointFile } = config.stateStorage;
  return [
    '## Delegated snapshot', '',
    `When \`${planFile}\` does not exist, this repository saves its state with \`${section.snapshotCommand}\` instead of \`${planFile}\` and \`${checkpointFile}\`, and these rules replace the \`RED\` and \`CRITICAL\` actions above:`, '',
    `- From \`${section.triggerZone}\` on, the telemetry action is \`${delegatedAction(section.snapshotCommand)}\`. Run \`${section.snapshotCommand}\`, then end the response with \`${SESSION_RESET_SIGNAL}\`.`,
    `- In \`CRITICAL\`, other tool calls are blocked. Only ${allowedItems(config, section)} are allowed.`,
    ...(section.resumeCommand === undefined ? [] : [`- After \`/clear\` or \`/new\`, run \`${section.resumeCommand}\` before continuing.`]),
    '',
  ];
}
function allowedItems(config: ContextBrakeConfig, section: DelegatedSnapshotConfig): string {
  const items = [
    ...(section.allowedPaths.length > 0 ? [`reading or writing ${quoted(section.allowedPaths)}`] : []),
    ...[...allowedSkillNames(section)].map((skill) => `the \`${skill}\` skill`),
    ...[...GIT_COMMANDS, ...config.brake.additionalAllowedCommands].map((command) => `\`${command}\``),
  ];
  return items.join(', ');
}
function quoted(values: readonly string[]): string {
  return values.map((value) => `\`${value}\``).join(', ');
}
