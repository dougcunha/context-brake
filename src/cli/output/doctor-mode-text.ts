import type { DoctorReport, SnapshotReport } from '../../core/contracts/diagnostics.js';
import { describeTrigger } from '../../core/services/trigger-text.js';
import type { CardRow } from './card.js';
import { formatTokens } from './token-format.js';

type Invocation = NonNullable<SnapshotReport['invocations']>[number];
type ContextWindow = NonNullable<DoctorReport['contextWindow']>;
type ContextReport = Pick<DoctorReport, 'contextWindow' | 'snapshot' | 'debugMode'>;

const UNKNOWN_WINDOW = 'unknown';
const DEBUG_ROW: CardRow = { label: 'debug mode', value: 'on', tone: 'warn' };

function resumeSuffix(resumeCommand: string | null): string {
  return resumeCommand === null ? '' : `, resume ${resumeCommand}`;
}

function invocationNote(invocation: Invocation): string {
  return `${invocation.harness}: ${invocation.command}${resumeSuffix(invocation.resumeCommand)}`;
}

export function describeSnapshot(snapshot: SnapshotReport): string {
  if (snapshot.command === null) return `not configured (zone headers only, trigger ${describeTrigger(snapshot)})`;
  return `${snapshot.command} at ${describeTrigger(snapshot)}${resumeSuffix(snapshot.resumeCommand)}`;
}

function windowRow(window: ContextWindow): CardRow {
  const lastWindow = window.lastWindowTokens === null ? UNKNOWN_WINDOW : formatTokens(window.lastWindowTokens);
  return { label: 'window', value: `${window.source} (mod ${window.mod}, bridge ${window.bridge}, last window ${lastWindow})` };
}

function snapshotRow(snapshot: SnapshotReport): CardRow {
  return { label: 'snapshot', value: describeSnapshot(snapshot), notes: (snapshot.invocations ?? []).map(invocationNote) };
}

export function contextRows(report: ContextReport): CardRow[] {
  return [
    ...(report.contextWindow === undefined ? [] : [windowRow(report.contextWindow)]),
    ...(report.snapshot === undefined ? [] : [snapshotRow(report.snapshot)]),
    ...(report.debugMode === true ? [DEBUG_ROW] : []),
  ];
}
