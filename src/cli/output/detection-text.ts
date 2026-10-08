import type { HarnessDetection } from '../../core/contracts/harness.js';

export function excludedDetectionLines(detections: readonly HarnessDetection[]): string[] {
  return detections.filter((detection) => detection.state === 'excluded').map((detection) => `  - ${detection.harness}: excluded by configuration\n`);
}
