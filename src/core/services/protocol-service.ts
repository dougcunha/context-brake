import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import { renderDelegatedProtocol } from './delegated-protocol.js';
import { zoneActionClause } from './zone-actions.js';
import { turnLimits, type TurnLimits } from './zone-classifier.js';

export type ProtocolZoneContext = Pick<ContextBrakeConfig, 'stateStorage' | 'brake'>;

function buildProtocolRow(condition: string, action: string): string {
  return `| ${condition} | ${action} |`;
}
function buildZoneRows(zones: ContextBrakeConfig['telemetry']['zones'], context: ProtocolZoneContext): string[] {
  const greenPct = zones.greenMaxPercentage + 1;
  const turns = turnClauses(turnLimits(zones));
  const files = {
    planFile: context.stateStorage.planFile,
    checkpointFile: context.stateStorage.checkpointFile,
    additionalAllowedCommands: context.brake.additionalAllowedCommands,
    instructCheckpointCommit: context.stateStorage.instructCheckpointCommit,
  };
  return [
    buildProtocolRow(`\`GREEN\` | Usage below ${greenPct}%${turns.green}`, zoneActionClause('GREEN', files)),
    buildProtocolRow(`\`YELLOW\` | Usage from ${greenPct}% to ${zones.yellowMaxPercentage}%${turns.yellow}`, zoneActionClause('YELLOW', files)),
    buildProtocolRow(`\`RED\` | Usage above ${zones.yellowMaxPercentage}%${turns.red}`, zoneActionClause('RED', files)),
    buildProtocolRow(`\`CRITICAL\` | Usage at ${zones.criticalPercentage}% or more`, zoneActionClause('CRITICAL', files)),
  ];
}
type TurnClauses = { readonly green: string; readonly yellow: string; readonly red: string };
function turnClauses(limits: TurnLimits | null): TurnClauses {
  if (limits === null) return { green: '', yellow: '', red: '' };
  return { green: ` and at most ${limits.greenMaxTurn} turns`, yellow: `, or ${limits.greenMaxTurn + 1} to ${limits.yellowMaxTurn} turns`, red: `, or ${limits.yellowMaxTurn + 1} turns or more` };
}
export function renderProtocol(config: ContextBrakeConfig): string {
  const { planFile, checkpointFile } = config.stateStorage;
  const rows = buildZoneRows(config.telemetry.zones, config);
  return [
    '# ContextBrake Protocol', '',
    `Applies while this repository has a \`${planFile}\` or tool results include a ContextBrake telemetry block. The limits below are defaults; \`context-brake.config.json\` overrides them.`, '',
    '## Telemetry', '',
    'A telemetry block reports the session turn, context usage and window size with a percentage, whether usage is measured by the harness or estimated, the current zone, and a recommended action. A turn is one completed tool call. When turn limits are configured, the turn also shows where `RED` starts. Turns never block tool calls; only context usage reaches `CRITICAL`.', '',
    `In \`YELLOW\` and \`RED\`, the action depends on whether \`${planFile}\` exists. Without it, keep doing the requested work; never stop only because no plan exists.`, '',
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
    ...renderDelegatedProtocol(config),
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
