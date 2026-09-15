import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { UsageReading } from '../contracts/zones.js';

export type BlockMessageInput = {
  readonly tool: string;
  readonly turn: number;
  readonly usagePercentage: number;
  readonly usage: UsageReading;
  readonly config: ContextBrakeConfig;
};

const BLOCKED_PREFIX = '[ContextBrake v1] BLOCKED';
const FAILURE_REASON = 'reason=integration_failure';
const FAILURE_ZONE = 'last recorded zone=CRITICAL';
const RED_ACTIONS = ' Save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET].';

export function renderBlockMessage(input: BlockMessageInput): string {
  const values = `turn=${input.turn}/${input.config.telemetry.turnCeiling} usage=${input.usagePercentage}% tokens=${input.usage.usedTokens ?? 0}/${input.usage.windowTokens} source=${input.usage.source}`;
  return `${BLOCKED_PREFIX} tool=${input.tool} zone=CRITICAL ${values} reason=critical_ceiling. ${allowedActions(input.config)}${RED_ACTIONS}`;
}
export function renderFailureBlockMessage(input: { readonly tool: string; readonly config: ContextBrakeConfig }): string {
  return `${BLOCKED_PREFIX} tool=${input.tool} zone=CRITICAL ${FAILURE_ZONE} ${FAILURE_REASON}. ${allowedActions(input.config)}${RED_ACTIONS}`;
}
function allowedActions(config: ContextBrakeConfig): string {
  const extras = config.brake.additionalAllowedCommands;
  const extraList = extras.length === 0 ? '' : `, ${extras.join(', ')}`;
  return `Allowed: read or write ${config.stateStorage.planFile} and ${config.stateStorage.checkpointFile}, the step validation command, git status, git add, git commit${extraList}.`;
}
