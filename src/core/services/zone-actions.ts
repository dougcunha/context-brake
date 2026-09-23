import type { Zone } from '../contracts/zones.js';

export type ZoneAction = {
  readonly compact: string;
  readonly protocol: string;
};

const PLANS_AND_CHECKPOINT = 'Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit`';
const CRITICAL_PROTOCOL = `${PLANS_AND_CHECKPOINT} are allowed. Complete the \`RED\` actions.`;
export const ZONE_ACTIONS: Record<Zone, ZoneAction> = {
  GREEN: { compact: 'work normally', protocol: 'Work normally.' },
  YELLOW: { compact: 'finish the current edit, start no new step, run the step validation', protocol: "Finish the current edit, do not start a new plan step, and run the step's validation command." },
  RED: { compact: 'save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]', protocol: 'Stop editing. Update the plan and checkpoint. If validation passes, commit with `checkpoint: <step title>`. End the response with `[REQUEST_SESSION_RESET]`.' },
  CRITICAL: { compact: 'other tools are blocked; finish the RED actions', protocol: CRITICAL_PROTOCOL },
};

export type ProtocolZoneContext = {
  readonly planFile: string;
  readonly checkpointFile: string;
  readonly additionalAllowedCommands?: readonly string[] | undefined;
  readonly instructCheckpointCommit?: boolean | undefined;
};

export function applyProtocolFileNames(text: string, context: ProtocolZoneContext): string {
  return text.replace('the plan and checkpoint', `\`${context.planFile}\` and \`${context.checkpointFile}\``);
}

function zoneRedClause(context: ProtocolZoneContext): string {
  const commit = context.instructCheckpointCommit ?? true;
  const base = commit
    ? ZONE_ACTIONS.RED.protocol
    : 'Stop editing. Update the plan and checkpoint. End the response with `[REQUEST_SESSION_RESET]`.';
  return applyProtocolFileNames(base, context);
}

export function zoneActionClause(zone: Zone, context: ProtocolZoneContext): string {
  switch (zone) {
    case 'GREEN': return ZONE_ACTIONS.GREEN.protocol;
    case 'YELLOW': return ZONE_ACTIONS.YELLOW.protocol;
    case 'RED': return zoneRedClause(context);
    case 'CRITICAL': return zoneCriticalClause(context);
  }
}
function zoneCriticalClause(context: ProtocolZoneContext): string {
  const commands = context.additionalAllowedCommands;
  if (!commands || commands.length === 0) return ZONE_ACTIONS.CRITICAL.protocol;
  return `${PLANS_AND_CHECKPOINT}${commands.map((command) => `, and \`${command}\``).join('')} are allowed. Complete the \`RED\` actions.`;
}
