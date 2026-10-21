import type { DiagnosticFinding, DoctorReport, HarnessDiagnostic } from '../../core/contracts/diagnostics.js';
import type { CardRow } from './card.js';
import type { Tone } from './style.js';

type Severity = DiagnosticFinding['severity'];
type SeverityWord = { readonly label: string; readonly tone: Tone };
export type RowOptions = { readonly verbose: boolean };

export const SEVERITY_WORDS: Record<Severity, SeverityWord> = {
  ok: { label: 'OK', tone: 'good' },
  warning: { label: 'WARN', tone: 'warn' },
  error: { label: 'ERROR', tone: 'bad' },
};

const PROBLEM_ORDER: readonly Severity[] = ['error', 'warning'];
const FIELD_GAP = '  ';
const PART_SEPARATOR = ', ';
const CODE_SEPARATOR = ', ';
const NO_PROBLEMS_ROW: CardRow = { label: '', value: 'No problems found.', tone: 'good' };
const STATE_TONES: Record<HarnessDiagnostic['state'], Tone> = { installed: 'good', missing: 'bad', broken: 'bad' };
const OVERHEAD_FAILED = 'fail';
const SLOW_SUFFIX = ` ${SEVERITY_WORDS.warning.label}`;
const FIX_COMMAND_TEXT = 'run context-brake fix';

function presentParts(parts: readonly (string | null)[]): string[] {
  return parts.filter((part): part is string => part !== null && part !== '');
}

function labeledNote(prefix: string, text: string | null): string | null {
  return text ? `${prefix}: ${text}` : null;
}

export function isFixable(finding: DiagnosticFinding): boolean {
  return finding.fix !== undefined && finding.fix.group !== 'manual';
}

function problemRow(finding: DiagnosticFinding): CardRow {
  const { label, tone } = SEVERITY_WORDS[finding.severity];
  const value = presentParts([finding.code, finding.harness, finding.path]).join(FIELD_GAP);
  const fixText = isFixable(finding) ? FIX_COMMAND_TEXT : finding.remediation;
  const notes = presentParts([finding.message, labeledNote('Impact', finding.impact), labeledNote('Fix', fixText)]);
  return { label, value, tone, notes };
}

export function problemRows(findings: readonly DiagnosticFinding[]): CardRow[] {
  const rows = PROBLEM_ORDER.flatMap((severity) => findings.filter((finding) => finding.severity === severity).map(problemRow));
  return rows.length === 0 ? [NO_PROBLEMS_ROW] : rows;
}

function overheadText(overhead: HarnessDiagnostic['overhead']): string | null {
  if (overhead === null || overhead.p95Milliseconds === null) return null;
  return `overhead ${Math.round(overhead.p95Milliseconds)} ms / ${overhead.targetMilliseconds} ms`;
}

function limitationNotes(integration: HarnessDiagnostic, options: RowOptions): string[] {
  if (!options.verbose) return [];
  return integration.support.limitations.map((limitation) => `${limitation.capability}: ${limitation.impact}`);
}

function integrationRow(integration: HarnessDiagnostic, options: RowOptions): CardRow {
  const isSlow = integration.overhead?.status === OVERHEAD_FAILED;
  const version = integration.version === null ? null : `version ${integration.version}`;
  const parts = presentParts([integration.state, `${integration.support.supportLevel} support`, version, overheadText(integration.overhead)]);
  const value = `${parts.join(PART_SEPARATOR)}${isSlow ? SLOW_SUFFIX : ''}`;
  return { label: integration.harness, value, tone: isSlow ? 'warn' : STATE_TONES[integration.state], notes: limitationNotes(integration, options) };
}

export function harnessRows(report: Pick<DoctorReport, 'integrations' | 'detections'>, options: RowOptions): CardRow[] {
  const excluded = report.detections.filter((detection) => detection.state === 'excluded');
  return [
    ...report.integrations.map((integration) => integrationRow(integration, options)),
    ...excluded.map((detection): CardRow => ({ label: detection.harness, value: 'excluded by configuration', tone: 'muted' })),
  ];
}

function passedCheckRow(finding: DiagnosticFinding): CardRow {
  return { label: SEVERITY_WORDS.ok.label, value: finding.code, tone: SEVERITY_WORDS.ok.tone, notes: [finding.message] };
}

export function checkRows(findings: readonly DiagnosticFinding[], options: RowOptions): CardRow[] {
  const passed = findings.filter((finding) => finding.severity === 'ok');
  if (passed.length === 0) return [];
  if (options.verbose) return passed.map(passedCheckRow);
  return [{ label: SEVERITY_WORDS.ok.label, value: passed.map((finding) => finding.code).join(CODE_SEPARATOR), tone: SEVERITY_WORDS.ok.tone }];
}
