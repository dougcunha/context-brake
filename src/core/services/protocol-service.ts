import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import { zoneActionClause } from './zone-actions.js';

export type ProtocolZoneContext = Pick<ContextBrakeConfig, 'stateStorage' | 'brake'>;

function buildProtocolRow(condition: string, action: string): string {
  return `| ${condition} | ${action} |`;
}
function buildZoneRows(zones: ContextBrakeConfig['telemetry']['zones'], context: ProtocolZoneContext): string[] {
  const greenPct = zones.greenMaxPercentage + 1;
  const yellowMinTurn = zones.greenMaxTurn + 1;
  const redMinTurn = zones.yellowMaxTurn + 1;
  const criticalPct = zones.criticalPercentage;
  const criticalTurn = zones.criticalTurn;
  const files = { planFile: context.stateStorage.planFile, checkpointFile: context.stateStorage.checkpointFile, additionalAllowedCommands: context.brake.additionalAllowedCommands };
  return [
    buildProtocolRow(`\`GREEN\` | Usage below ${greenPct}% and at most ${zones.greenMaxTurn} turns`, zoneActionClause('GREEN', files)),
    buildProtocolRow(`\`YELLOW\` | Usage from ${greenPct}% to ${zones.yellowMaxPercentage}%, or ${yellowMinTurn} to ${zones.yellowMaxTurn} turns`, zoneActionClause('YELLOW', files)),
    buildProtocolRow(`\`RED\` | Usage above ${zones.yellowMaxPercentage}%, or ${redMinTurn} turns or more`, zoneActionClause('RED', files)),
    buildProtocolRow(`\`CRITICAL\` | Usage at ${criticalPct}% or more, or ${criticalTurn} turns or more`, zoneActionClause('CRITICAL', files)),
  ];
}
export function renderProtocol(config: ContextBrakeConfig): string {
  const { planFile, checkpointFile } = config.stateStorage;
  const rows = buildZoneRows(config.telemetry.zones, config);
  return [
    '# ContextBrake Protocol', '',
    `Applies while this repository has a \`${planFile}\` or tool results include a ContextBrake telemetry block. The limits below are defaults; \`context-brake.config.json\` overrides them.`, '',
    '## Telemetry', '',
    'A telemetry block reports the session turn and turn ceiling, context usage and window size with a percentage, whether usage is measured by the harness or estimated, the current zone, and a recommended action. A turn is one completed tool call.', '',
    '## Zones', '', 'When several conditions match, the highest zone applies.', '',
    '| Zone | Default condition | What to do |', '| --- | --- | --- |', ...rows, '',
    '## Checkpoint', '',
    `Record discovered constraints, decisions, blocked items, and breaking changes in their own fields of \`${checkpointFile}\` instead of a free-form summary. Never write secrets to the checkpoint.`, '',
    '## Starting a new session', '', 'After `/clear` or `/new`:', '',
    '1. If the session starts with a ContextBrake boot summary, use it for steps 2 to 4 and open the files only for details it points to.',
    `2. Read \`${planFile}\` and find the \`IN_PROGRESS\` step, or the first \`PENDING\` step.`,
    `3. Read \`${checkpointFile}\` and apply every discovered constraint.`,
    '4. Check that the recorded commit exists in the current branch history and that the working tree is clean; report any divergence before editing.',
    '5. Run the validation command of the active step, or of the last completed step, before editing code. If it fails, fix the inherited state before continuing.',
    '6. Continue the active step.', '',
  ].join('\n');
}

export function planProtocolChange(config: ContextBrakeConfig, snapshot: FileSnapshot, isManaged: boolean): { change?: PlannedChange; conflict?: PlanConflict } {
  const rendered = renderProtocol(config);
  if (!snapshot.exists) {
    const change: PlannedChange = { path: snapshot.path, realPath: snapshot.realPath, kind: 'create', owner: 'protocol', content: rendered, preview: { summary: 'Create ContextBrake protocol documentation' } };
    return { change };
  }
  if (snapshot.content === rendered) return {};
  if (!isManaged) {
    const conflict: PlanConflict = { path: snapshot.path, code: 'UNMANAGED_PROTOCOL_CONFLICT', detail: 'Existing unmanaged protocol file differs from configuration' };
    return { conflict };
  }
  const change: PlannedChange = { path: snapshot.path, realPath: snapshot.realPath, kind: 'update', owner: 'protocol', content: rendered, preview: { summary: 'Update ContextBrake protocol documentation' } };
  return { change };
}
