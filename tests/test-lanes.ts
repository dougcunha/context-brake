export const TEST_FILE_PATTERN = 'tests/**/*.test.ts';
export const TEST_FILE_SUFFIX = '.test.ts';

export const PROCESS_LANE_DIRECTORIES: readonly string[] = ['tests/e2e/'];

export const PROCESS_LANE_FILES: readonly string[] = [
  'tests/integration/cli-shells.test.ts',
  'tests/integration/codex-hook-command-shells.test.ts',
  'tests/integration/codex-hook-root.test.ts',
  'tests/integration/node-process-runner.test.ts',
  'tests/integration/package-assets.test.ts',
  'tests/integration/package-contents.test.ts',
  'tests/integration/runtime-host-process.test.ts',
  'tests/integration/runtime-parallel-turns.test.ts',
  'tests/integration/statusline-bridge-lifecycle.test.ts',
  'tests/integration/statusline-bridge-previous.test.ts',
  'tests/integration/statusline-bridge.test.ts',
  'tests/integration/statusline-shell.test.ts',
];

export const SERIAL_LANE_FILES: readonly string[] = [
  'tests/integration/node-process-runner.test.ts',
];

export const PROCESS_MARKERS: readonly string[] = [
  'node:child_process',
  'cli-runner',
  'shell-runner',
  'built-hook',
  'NodeOverheadMeasurer',
  'NodeProcessRunner',
  'npm pack',
];

export function processLaneGlobs(): string[] {
  const directoryGlobs = PROCESS_LANE_DIRECTORIES.map((directory) => `${directory}**/*${TEST_FILE_SUFFIX}`);
  return [...directoryGlobs, ...PROCESS_LANE_FILES];
}

export function isSerialLaneFile(file: string): boolean {
  return SERIAL_LANE_FILES.includes(file);
}

export function isProcessLaneFile(file: string): boolean {
  return PROCESS_LANE_DIRECTORIES.some((directory) => file.startsWith(directory)) || PROCESS_LANE_FILES.includes(file);
}

export function hasProcessMarker(source: string): boolean {
  return PROCESS_MARKERS.some((marker) => source.includes(marker));
}
