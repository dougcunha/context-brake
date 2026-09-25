import type { Zone } from '../contracts/zones.js';

export type ZoneAction = {
  readonly compact: string;
  readonly protocol: string;
};
export type PlanAwareAction = {
  readonly withPlan: ZoneAction;
  readonly withoutPlan: ZoneAction;
};
export type ZoneActions = {
  readonly GREEN: ZoneAction;
  readonly YELLOW: PlanAwareAction;
  readonly RED: PlanAwareAction;
  readonly CRITICAL: ZoneAction;
};

const PLANS_AND_CHECKPOINT = 'Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit`';
const CRITICAL_PROTOCOL = `${PLANS_AND_CHECKPOINT} are allowed. Complete the \`RED\` actions.`;
const RED_WITHOUT_COMMIT = 'Stop editing. Update the plan and checkpoint. End the response with `[REQUEST_SESSION_RESET]`.';
export const ZONE_ACTIONS: ZoneActions = {
  GREEN: { compact: 'work normally', protocol: 'Work normally.' },
  YELLOW: {
    withPlan: { compact: 'finish the current edit, start no new step, run the step validation', protocol: "Finish the current edit, do not start a new plan step, and run the step's validation command." },
    withoutPlan: { compact: 'keep working; finish the current unit before large new explorations', protocol: 'Keep working, and prefer finishing the current unit of work before starting large new explorations.' },
  },
  RED: {
    withPlan: { compact: 'save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]', protocol: 'Stop editing. Update the plan and checkpoint. If validation passes, commit with `checkpoint: <step title>`. End the response with `[REQUEST_SESSION_RESET]`.' },
    withoutPlan: { compact: 'finish or pause the current unit, record progress, end reply with [REQUEST_SESSION_RESET]', protocol: 'Finish or pause the current unit of work. Record progress where the project already keeps state, or tell the user what remains. End the response with `[REQUEST_SESSION_RESET]`.' },
  },
  CRITICAL: { compact: 'other tools are blocked; finish the RED actions', protocol: CRITICAL_PROTOCOL },
};

export type ProtocolZoneContext = {
  readonly planFile: string;
  readonly checkpointFile: string;
  readonly additionalAllowedCommands?: readonly string[] | undefined;
  readonly instructCheckpointCommit?: boolean | undefined;
};

export function isPlanAwareZone(zone: Zone): zone is 'YELLOW' | 'RED' {
  return zone === 'YELLOW' || zone === 'RED';
}
export function compactZoneAction(zone: Zone, planPresent: boolean): string {
  if (!isPlanAwareZone(zone)) return ZONE_ACTIONS[zone].compact;
  return planPresent ? ZONE_ACTIONS[zone].withPlan.compact : ZONE_ACTIONS[zone].withoutPlan.compact;
}
export function applyProtocolFileNames(text: string, context: ProtocolZoneContext): string {
  return text.replace('the plan and checkpoint', `\`${context.planFile}\` and \`${context.checkpointFile}\``);
}

function planVariants(withPlan: string, withoutPlan: string, context: ProtocolZoneContext): string {
  return `With \`${context.planFile}\`: ${withPlan} Without it: ${withoutPlan}`;
}
function zoneRedClause(context: ProtocolZoneContext): string {
  const commit = context.instructCheckpointCommit ?? true;
  const withPlan = applyProtocolFileNames(commit ? ZONE_ACTIONS.RED.withPlan.protocol : RED_WITHOUT_COMMIT, context);
  return planVariants(withPlan, ZONE_ACTIONS.RED.withoutPlan.protocol, context);
}

export function zoneActionClause(zone: Zone, context: ProtocolZoneContext): string {
  switch (zone) {
    case 'GREEN': return ZONE_ACTIONS.GREEN.protocol;
    case 'YELLOW': return planVariants(ZONE_ACTIONS.YELLOW.withPlan.protocol, ZONE_ACTIONS.YELLOW.withoutPlan.protocol, context);
    case 'RED': return zoneRedClause(context);
    case 'CRITICAL': return zoneCriticalClause(context);
  }
}
function zoneCriticalClause(context: ProtocolZoneContext): string {
  const commands = context.additionalAllowedCommands;
  if (!commands || commands.length === 0) return ZONE_ACTIONS.CRITICAL.protocol;
  return `${PLANS_AND_CHECKPOINT}${commands.map((command) => `, and \`${command}\``).join('')} are allowed. Complete the \`RED\` actions.`;
}
