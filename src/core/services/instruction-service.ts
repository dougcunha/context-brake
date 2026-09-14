import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import { countOccurrences, CURRENT_END_MARKER, CURRENT_START_MARKER, extractUnmatchedLegacyContent, LEGACY_END_MARKER, LEGACY_START_MARKER, renderReferenceBlock } from './instruction-markers.js';

export type InstructionPlanInput = {
  snapshots: readonly FileSnapshot[];
  config: ContextBrakeConfig;
  createInstructions?: boolean | undefined;
  migrateLegacy?: boolean | undefined;
};

export type InstructionPlanResult = {
  changes: readonly PlannedChange[];
  conflicts: readonly PlanConflict[];
  legacyDetected: readonly string[];
};

function deduplicateSnapshots(snapshots: readonly FileSnapshot[]): FileSnapshot[] {
  const seen = new Set<string>();
  const result: FileSnapshot[] = [];
  for (const snap of snapshots) {
    if (!seen.has(snap.fileIdentity)) {
      seen.add(snap.fileIdentity);
      result.push(snap);
    }
  }
  return result;
}

function planMissingInstruction(snap: FileSnapshot, config: ContextBrakeConfig, create: boolean): PlannedChange | null {
  if (!create) return null;
  const block = `${renderReferenceBlock(config.stateStorage.planFile, config.instructionFiles.protocolFile, '\n')}\n`;
  return { path: snap.path, realPath: snap.realPath, kind: 'create', owner: 'instruction_block', content: block, preview: { summary: 'Create instruction file with ContextBrake reference block' } };
}

function migrateLegacyBlock(content: string, span: { start: number; end: number }, ctx: { config: ContextBrakeConfig; eol: string }): string {
  const body = content.slice(span.start + LEGACY_START_MARKER.length, span.end);
  const unmatched = extractUnmatchedLegacyContent(body, ctx.eol);
  const target = renderReferenceBlock(ctx.config.stateStorage.planFile, ctx.config.instructionFiles.protocolFile, ctx.eol);
  const migrated = unmatched.length > 0 ? `${unmatched}${ctx.eol}${ctx.eol}${target}` : target;
  return `${content.slice(0, span.start)}${migrated}${content.slice(span.end + LEGACY_END_MARKER.length)}`;
}

function checkMarkerCounts(content: string, path: string): PlanConflict | null {
  const cStarts = countOccurrences(content, CURRENT_START_MARKER);
  const cEnds = countOccurrences(content, CURRENT_END_MARKER);
  if (cStarts > 1 || cEnds > 1) return { path, code: 'DUPLICATE_INSTRUCTION_MARKERS', detail: 'Multiple ContextBrake blocks' };
  if (cStarts !== cEnds) return { path, code: 'MALFORMED_INSTRUCTION_MARKERS', detail: 'Mismatched ContextBrake markers' };
  const lStarts = countOccurrences(content, LEGACY_START_MARKER);
  const lEnds = countOccurrences(content, LEGACY_END_MARKER);
  if (lStarts > 1 || lEnds > 1) return { path, code: 'DUPLICATE_LEGACY_MARKERS', detail: 'Multiple legacy blocks' };
  if (lStarts !== lEnds) return { path, code: 'MALFORMED_LEGACY_MARKERS', detail: 'Mismatched legacy markers' };
  return null;
}

function planExistingInstruction(snap: FileSnapshot, config: ContextBrakeConfig, migrateLegacy: boolean): { change?: PlannedChange; conflict?: PlanConflict; legacy?: boolean } {
  const content = snap.content ?? '';
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const countConflict = checkMarkerCounts(content, snap.path);
  if (countConflict) return { conflict: countConflict };
  if (content.includes(CURRENT_START_MARKER)) {
    const s = content.indexOf(CURRENT_START_MARKER);
    const e = content.indexOf(CURRENT_END_MARKER);
    if (s > e) return { conflict: { path: snap.path, code: 'MALFORMED_INSTRUCTION_MARKERS', detail: 'Start marker after end marker' } };
    const existing = content.slice(s, e + CURRENT_END_MARKER.length);
    const target = renderReferenceBlock(config.stateStorage.planFile, config.instructionFiles.protocolFile, eol);
    if (existing === target) return {};
    const updated = `${content.slice(0, s)}${target}${content.slice(e + CURRENT_END_MARKER.length)}`;
    return { change: { path: snap.path, realPath: snap.realPath, kind: 'update', owner: 'instruction_block', content: updated, preview: { summary: 'Update ContextBrake reference block' } } };
  }
  if (content.includes(LEGACY_START_MARKER)) {
    const s = content.indexOf(LEGACY_START_MARKER);
    const e = content.indexOf(LEGACY_END_MARKER);
    if (s > e) return { conflict: { path: snap.path, code: 'MALFORMED_LEGACY_MARKERS', detail: 'Start marker after end marker' } };
    if (!migrateLegacy) return { legacy: true };
    const updated = migrateLegacyBlock(content, { start: s, end: e }, { config, eol });
    return { change: { path: snap.path, realPath: snap.realPath, kind: 'update', owner: 'instruction_block', content: updated, preview: { summary: 'Migrate legacy CONTEXTOPS block to ContextBrake reference' } } };
  }
  const target = renderReferenceBlock(config.stateStorage.planFile, config.instructionFiles.protocolFile, eol);
  const hasTrail = content.endsWith('\n') || content.endsWith('\r\n');
  const prefix = content.length === 0 ? '' : (hasTrail ? eol : `${eol}${eol}`);
  const updated = `${content}${prefix}${target}${hasTrail ? eol : ''}`;
  return { change: { path: snap.path, realPath: snap.realPath, kind: 'update', owner: 'instruction_block', content: updated, preview: { summary: 'Add ContextBrake reference block' } } };
}

export function planInstructionChanges(input: InstructionPlanInput): InstructionPlanResult {
  const unique = deduplicateSnapshots(input.snapshots);
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  const legacyDetected: string[] = [];
  for (const snap of unique) {
    if (!snap.exists) {
      const missing = planMissingInstruction(snap, input.config, input.createInstructions ?? false);
      if (missing) changes.push(missing);
      continue;
    }
    const { change, conflict, legacy } = planExistingInstruction(snap, input.config, input.migrateLegacy ?? false);
    if (conflict) conflicts.push(conflict);
    if (change) changes.push(change);
    if (legacy) legacyDetected.push(snap.path);
  }
  return { changes, conflicts, legacyDetected };
}
