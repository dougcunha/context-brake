import type { CheckpointModeReport } from '../../core/contracts/diagnostics.js';

export function renderCheckpointModeLine(mode: CheckpointModeReport | undefined): string | null {
  if (mode?.lightMode !== undefined) return `  - checkpoint mode: light (trigger: ${mode.lightMode.triggerZone})\n`;
  if (mode?.delegatedSnapshot) return `  - checkpoint mode: ${mode.effective} (${mode.reason}, snapshot command: ${mode.delegatedSnapshot.snapshotCommand})\n`;
  return null;
}
