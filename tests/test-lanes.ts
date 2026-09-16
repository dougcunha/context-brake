export const TEST_FILE_PATTERN = 'tests/**/*.test.ts';
export const TEST_FILE_SUFFIX = '.test.ts';

export const PROCESS_LANE_DIRECTORIES: readonly string[] = ['tests/e2e/'];

export const PROCESS_LANE_FILES: readonly string[] = [
  'tests/integration/codex-hook-command-shells.test.ts',
  'tests/integration/doctor-asset-currency.test.ts',
  'tests/integration/doctor-benchmark.test.ts',
  'tests/integration/doctor-manual-removal.test.ts',
  'tests/integration/gitignore-lifecycle.test.ts',
  'tests/integration/invalid-config.test.ts',
  'tests/integration/linked-project-root.test.ts',
  'tests/integration/node-process-runner.test.ts',
  'tests/integration/package-assets.test.ts',
  'tests/integration/package-contents.test.ts',
  'tests/integration/runtime-antigravity.test.ts',
  'tests/integration/runtime-block-log.test.ts',
  'tests/integration/runtime-codex.test.ts',
  'tests/integration/runtime-copilot.test.ts',
  'tests/integration/runtime-cursor.test.ts',
  'tests/integration/runtime-failure-policy.test.ts',
  'tests/integration/runtime-host-process.test.ts',
  'tests/integration/runtime-invalid-config.test.ts',
  'tests/integration/runtime-in-process.test.ts',
  'tests/integration/runtime-parallel-turns.test.ts',
  'tests/integration/runtime-retention.test.ts',
  'tests/integration/runtime-session-ledger.test.ts',
  'tests/integration/runtime-state-removal.test.ts',
  'tests/integration/safe-removal.test.ts',
  'tests/unit/init-legacy-preview.test.ts',
  'tests/unit/overhead-measurer.test.ts',
];

export const PROCESS_MARKERS: readonly string[] = [
  'node:child_process',
  'cli-runner',
  'shell-runner',
  'NodeOverheadMeasurer',
  'NodeProcessRunner',
  '/cli/commands/',
  'composition-root',
  'npm pack',
];

export function processLaneGlobs(): string[] {
  const directoryGlobs = PROCESS_LANE_DIRECTORIES.map((directory) => `${directory}**/*${TEST_FILE_SUFFIX}`);
  return [...directoryGlobs, ...PROCESS_LANE_FILES];
}

export function isProcessLaneFile(file: string): boolean {
  return PROCESS_LANE_DIRECTORIES.some((directory) => file.startsWith(directory)) || PROCESS_LANE_FILES.includes(file);
}

export function hasProcessMarker(source: string): boolean {
  return PROCESS_MARKERS.some((marker) => source.includes(marker));
}
