import type { InstallReport } from '../../core/contracts/diagnostics.js';
import { renderCard, type CardRow } from './card.js';
import { changeRows, conflictRows, findingRows, harnessRows } from './install-rows.js';
import { detectStyle, type Style, type Tone } from './style.js';

type StatusWord = { readonly label: string; readonly tone: Tone };

const STATUS_WORDS: Record<InstallReport['status'], StatusWord> = {
  success: { label: '[OK]', tone: 'good' },
  warnings: { label: '[WARN]', tone: 'warn' },
  errors: { label: '[ERROR]', tone: 'bad' },
};

function headerLine(report: InstallReport, style: Style): string {
  const { label, tone } = STATUS_WORDS[report.status];
  return `${style.paint(tone, label)} ${style.paint('title', `ContextBrake ${report.command} (${report.mode})`)}`;
}

function cardSections(report: InstallReport, style: Style): string[] {
  const sections: readonly (readonly [string, CardRow[]])[] = [
    ['Harnesses', harnessRows(report)], ['Planned changes', changeRows(report)], ['Conflicts', conflictRows(report)], ['Findings', findingRows(report)],
  ];
  return sections.filter(([, rows]) => rows.length > 0).flatMap(([title, rows]) => ['', ...renderCard(title, rows, style)]);
}

export function formatInstallReport(report: InstallReport, style: Style): string {
  return `${[headerLine(report, style), ...cardSections(report, style)].join('\n')}\n`;
}

export function renderInstallText(report: InstallReport, style?: Style): void {
  const stream = report.status === 'errors' ? process.stderr : process.stdout;
  const chosen = style ?? detectStyle({ env: process.env, platform: process.platform, isTty: stream.isTTY === true });
  stream.write(formatInstallReport(report, chosen));
}
