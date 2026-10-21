import type { DiagnosticFinding, DoctorReport } from '../../core/contracts/diagnostics.js';
import { renderCard, type CardRow } from './card.js';
import { contextRows } from './doctor-mode-text.js';
import { checkRows, harnessRows, isFixable, problemRows, SEVERITY_WORDS } from './doctor-rows.js';
import { sessionRows } from './doctor-sessions-text.js';
import { detectStyle, type Style } from './style.js';

export type DoctorTextOptions = { readonly verbose: boolean; readonly now: Date };
export type DoctorFormatOptions = DoctorTextOptions & { readonly style: Style };
type Section = readonly [string, readonly CardRow[]];

const STATUS_WORDS = { healthy: SEVERITY_WORDS.ok, warnings: SEVERITY_WORDS.warning, errors: SEVERITY_WORDS.error } as const;
const NO_PROBLEMS_SUMMARY = 'no problems found';
const PASSED_CHECK_MESSAGES = 'the passed-check messages';

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function countSeverity(findings: readonly DiagnosticFinding[], severity: DiagnosticFinding['severity']): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function fixableSuffix(findings: readonly DiagnosticFinding[]): string {
  const fixable = findings.filter(isFixable).length;
  return fixable === 0 ? '' : `, ${fixable} fixable`;
}

function headerSummary(findings: readonly DiagnosticFinding[]): string {
  const errors = countSeverity(findings, 'error');
  const warnings = countSeverity(findings, 'warning');
  if (errors + warnings === 0) return NO_PROBLEMS_SUMMARY;
  return `${plural(errors, 'error')}, ${plural(warnings, 'warning')}${fixableSuffix(findings)}`;
}

export function formatDoctorHeader(report: DoctorReport, style: Style): string {
  const { label, tone } = STATUS_WORDS[report.status];
  return `${style.paint('title', 'ContextBrake doctor:')} ${style.paint(tone, label)} (${headerSummary(report.findings)})`;
}

function sections(report: DoctorReport, options: DoctorFormatOptions): Section[] {
  return [
    ['Problems', problemRows(report.findings)],
    ['Harnesses', harnessRows(report, options)],
    ['Context', contextRows(report)],
    ['Sessions', sessionRows(report.activeSessions, options.now)],
    ['Checks passed', checkRows(report.findings, options)],
  ];
}

function hiddenParts(report: DoctorReport): string[] {
  const limitations = report.integrations.reduce((total, integration) => total + integration.support.limitations.length, 0);
  const hasPassedChecks = countSeverity(report.findings, 'ok') > 0;
  return [
    ...(limitations > 0 ? [plural(limitations, 'capability limitation')] : []),
    ...(hasPassedChecks ? [PASSED_CHECK_MESSAGES] : []),
  ];
}

function verboseHint(report: DoctorReport, options: DoctorFormatOptions): string[] {
  const parts = options.verbose ? [] : hiddenParts(report);
  if (parts.length === 0) return [];
  return ['', options.style.paint('muted', `Run context-brake doctor --verbose to see ${parts.join(' and ')}.`)];
}

export function formatDoctorReport(report: DoctorReport, options: DoctorFormatOptions): string {
  const cards = sections(report, options).filter(([, rows]) => rows.length > 0).flatMap(([title, rows]) => ['', ...renderCard(title, rows, options.style)]);
  return `${[formatDoctorHeader(report, options.style), ...cards, ...verboseHint(report, options)].join('\n')}\n`;
}

export function renderDoctorText(report: DoctorReport, options: DoctorTextOptions): void {
  const style = detectStyle({ env: process.env, platform: process.platform, isTty: process.stdout.isTTY === true });
  process.stdout.write(formatDoctorReport(report, { ...options, style }));
}
