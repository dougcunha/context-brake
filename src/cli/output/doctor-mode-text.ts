import type { CheckpointModeReport, DoctorReport } from '../../core/contracts/diagnostics.js';

function renderCheckpointModeLine(mode: CheckpointModeReport | undefined): string | null {
  if (mode?.lightMode !== undefined) return `  - checkpoint mode: light (trigger: ${mode.lightMode.triggerZone})\n`;
  if (mode?.delegatedSnapshot) return `  - checkpoint mode: ${mode.effective} (${mode.reason}, snapshot command: ${mode.delegatedSnapshot.snapshotCommand})\n`;
  return null;
}
export function renderModeLines(report: Pick<DoctorReport, 'checkpointMode' | 'debugMode'>): string {
  const debug = report.debugMode === true ? '  - debug mode: on\n' : '';
  return `${renderCheckpointModeLine(report.checkpointMode) ?? ''}${debug}`;
}
