import type { ExecutableResult, ExecutableSearch, ProcessResult, ProcessRunner } from '../../src/core/contracts/processes.js';

const SUCCESS_EXIT_CODE = 0;

export function runnerReporting(version: string | null): ProcessRunner {
  return {
    discover(request: ExecutableSearch): Promise<readonly ExecutableResult[]> {
      return Promise.resolve(request.names.map((name) => ({ name, path: version === null ? null : `/fake/${name}`, timedOut: false })));
    },
    run(): Promise<ProcessResult> {
      const stdout = version === null ? '' : `${version} (Claude Code)\n`;
      return Promise.resolve({ status: 'completed', exitCode: SUCCESS_EXIT_CODE, stdout, stderr: '' });
    },
  };
}
