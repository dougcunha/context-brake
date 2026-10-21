import type { FixOutcome } from '../../core/contracts/fix.js';
import type { FixOutcomeItem, FixReport } from '../../core/contracts/fix-report.js';
import type { CardRow } from './card.js';
import type { Tone } from './style.js';

type OutcomeWord = { readonly label: string; readonly tone: Tone };

const OUTCOME_WORDS: Record<FixOutcome, OutcomeWord> = {
  fixed: { label: 'FIXED', tone: 'good' },
  skipped: { label: 'SKIPPED', tone: 'warn' },
  manual: { label: 'MANUAL', tone: 'muted' },
  failed: { label: 'FAILED', tone: 'bad' },
  planned: { label: 'PLANNED', tone: 'accent' },
};
const FIELD_GAP = '  ';

function presentParts(parts: readonly (string | null)[]): string[] {
  return parts.filter((part): part is string => part !== null && part !== '');
}

function codesAt(path: string, outcomes: readonly FixOutcomeItem[]): string | null {
  const codes = outcomes.filter((item) => item.path === path && item.group !== 'manual').map((item) => item.code);
  return codes.length === 0 ? null : codes.join(', ');
}

export function planRows(report: Pick<FixReport, 'plan' | 'outcomes'>): CardRow[] {
  return report.plan.changes.map((change) => ({ label: change.kind, value: presentParts([change.path, codesAt(change.path, report.outcomes)]).join(FIELD_GAP), notes: [change.summary] }));
}

export function conflictRows(report: Pick<FixReport, 'plan'>): CardRow[] {
  return report.plan.conflicts.map((conflict) => ({ label: 'conflict', value: `${conflict.path}${FIELD_GAP}${conflict.code}`, tone: 'warn', notes: [conflict.detail] }));
}

function findingValue(item: FixOutcomeItem): string {
  return presentParts([item.code, item.harness, item.path]).join(FIELD_GAP);
}

export function resultRows(outcomes: readonly FixOutcomeItem[]): CardRow[] {
  return outcomes.map((item) => ({ ...OUTCOME_WORDS[item.outcome], value: findingValue(item), notes: presentParts([item.detail]) }));
}

export function manualRows(outcomes: readonly FixOutcomeItem[]): CardRow[] {
  return outcomes.filter((item) => item.group === 'manual').map((item) => ({ ...OUTCOME_WORDS.manual, value: findingValue(item), notes: presentParts([item.detail]) }));
}
