import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { HarnessDetection } from '../contracts/harness.js';

const ALL_EXCLUDED_MESSAGE = 'All detected harnesses are excluded by configuration.';

export function noProjectHarnessFinding(detections: readonly HarnessDetection[]): DiagnosticFinding {
  const hasExcluded = detections.some((detection) => detection.state === 'excluded');
  return {
    code: 'NO_PROJECT_HARNESS', severity: 'warning', scope: 'project', harness: null, path: null,
    message: hasExcluded ? ALL_EXCLUDED_MESSAGE : 'No project harness was detected.', impact: null,
    remediation: hasExcluded ? 'Include one with --harness <id>.' : 'Select one with --harness <id>.',
  };
}
