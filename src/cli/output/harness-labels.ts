import type { HarnessId } from '../../core/contracts/harness.js';

const HARNESS_LABELS: Readonly<Partial<Record<HarnessId, string>>> = { 'claude-code': 'Claude Code', pi: 'Pi', 'oh-my-pi': 'Oh-My-Pi' };
const UNKNOWN_HARNESS = 'the harness';

export function harnessLabel(harness: HarnessId | null): string {
  if (harness === null) return UNKNOWN_HARNESS;
  return HARNESS_LABELS[harness] ?? harness;
}

export function restartNote(harness: HarnessId | null): string {
  return `Restart ${harnessLabel(harness)} to load the new mod.`;
}
