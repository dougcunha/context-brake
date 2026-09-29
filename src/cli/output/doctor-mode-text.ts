import type { CheckpointModeReport, DoctorReport } from '../../core/contracts/diagnostics.js';

type BrakeWindowEntry = NonNullable<DoctorReport['brakeWindow']>[number];

const REASON_TEXT: Readonly<Record<BrakeWindowEntry['reason'], string>> = {
  harness: 'harness window', declared: 'declared window', bridge: 'status line bridge', bridge_absent: 'no status line bridge', no_source: 'no harness window',
};

function renderCheckpointModeLine(mode: CheckpointModeReport | undefined): string | null {
  if (mode?.lightMode !== undefined) return `  - checkpoint mode: light (trigger: ${mode.lightMode.triggerZone})\n`;
  if (mode?.delegatedSnapshot) return `  - checkpoint mode: ${mode.effective} (${mode.reason}, snapshot command: ${mode.delegatedSnapshot.snapshotCommand})\n`;
  return null;
}
function renderBrakeWindowLine(entries: readonly BrakeWindowEntry[] | undefined): string {
  if (entries === undefined || entries.length === 0) return '';
  const parts = entries.map((entry) => `${entry.harness} ${entry.canDeny ? 'can block' : 'only warns'} (${REASON_TEXT[entry.reason]})`);
  return `  - brake: ${parts.join(', ')}\n`;
}
export function renderModeLines(report: Pick<DoctorReport, 'checkpointMode' | 'debugMode' | 'brakeWindow'>): string {
  const debug = report.debugMode === true ? '  - debug mode: on\n' : '';
  return `${renderCheckpointModeLine(report.checkpointMode) ?? ''}${debug}${renderBrakeWindowLine(report.brakeWindow)}`;
}
