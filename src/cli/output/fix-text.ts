import type { FixGroup } from '../../core/contracts/fix.js';
import type { FixOutcomeItem, FixReport } from '../../core/contracts/fix-report.js';
import { NOT_INSTALLED_REASON } from '../../core/services/fix-outcomes.js';
import { renderCard, type CardRow } from './card.js';
import { formatDoctorHeader } from './doctor-text.js';
import { conflictRows, manualRows, planRows, resultRows } from './fix-rows.js';
import { detectStyle, type Style } from './style.js';

type Section = readonly [string, readonly CardRow[]];

const TITLE = 'ContextBrake fix:';
const NOTHING_TO_FIX = 'nothing can be fixed automatically';
const DRY_RUN_NOTE = 'Dry run: no file was changed.';

function countGroup(outcomes: readonly FixOutcomeItem[], group: FixGroup): number {
  return outcomes.filter((item) => item.group === group).length;
}

export function fixSummary(outcomes: readonly FixOutcomeItem[]): string {
  const decisions = countGroup(outcomes, 'decision');
  const verb = decisions === 1 ? 'needs' : 'need';
  return `${countGroup(outcomes, 'automatic')} fixable, ${decisions} ${verb} a decision, ${countGroup(outcomes, 'manual')} manual`;
}

function summaryLine(report: FixReport, style: Style): string {
  const text = report.stopped === 'nothing_to_fix' ? NOTHING_TO_FIX : fixSummary(report.outcomes);
  return `${style.paint('title', TITLE)} ${text}`;
}

export function renderSections(sections: readonly Section[], style: Style): string[] {
  return sections.filter(([, rows]) => rows.length > 0).flatMap(([title, rows]) => ['', ...renderCard(title, rows, style)]);
}

function lines(parts: readonly string[]): string {
  return `${parts.join('\n')}\n`;
}

export function formatFixSummary(report: FixReport, style: Style): string {
  return lines([summaryLine(report, style)]);
}

export function formatFixPreview(report: FixReport, style: Style): string {
  return lines([...renderSections([['Plan', planRows(report)], ['Conflicts', conflictRows(report)], ['Manual', manualRows(report.outcomes)]], style)]);
}

export function formatFixResult(report: FixReport, style: Style): string {
  const dryRun = report.mode === 'dry_run' ? ['', DRY_RUN_NOTE] : [];
  return lines([...renderSections([['Result', resultRows(report.outcomes)]], style), ...dryRun, '', formatDoctorHeader(report.doctor, style)]);
}

export function formatFixReport(report: FixReport, style: Style): string {
  if (report.stopped === 'not_installed') return lines([`${style.paint('title', TITLE)} ${NOT_INSTALLED_REASON}`]);
  const plan = renderSections([['Plan', planRows(report)], ['Conflicts', conflictRows(report)]], style);
  return `${lines([summaryLine(report, style), ...plan])}${formatFixResult(report, style)}`;
}

export function stdoutStyle(): Style {
  return detectStyle({ env: process.env, platform: process.platform, isTty: process.stdout.isTTY === true });
}

export function renderFixText(report: FixReport): void {
  process.stdout.write(formatFixReport(report, stdoutStyle()));
}
