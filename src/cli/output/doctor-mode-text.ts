import type { DoctorReport, SnapshotReport } from '../../core/contracts/diagnostics.js';

function renderSnapshotLine(snapshot: SnapshotReport | undefined): string {
  if (snapshot === undefined) return '';
  if (snapshot.command === null) return `  - snapshot: not configured (zone headers only, trigger: ${snapshot.triggerZone})\n`;
  const resume = snapshot.resumeCommand === null ? '' : `, resume: ${snapshot.resumeCommand}`;
  return `  - snapshot: ${snapshot.command} at ${snapshot.triggerZone}${resume}\n`;
}
export function renderModeLines(report: Pick<DoctorReport, 'snapshot' | 'debugMode'>): string {
  const debug = report.debugMode === true ? '  - debug mode: on\n' : '';
  return `${renderSnapshotLine(report.snapshot)}${debug}`;
}
