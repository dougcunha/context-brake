import type { ExecutableResult, ExecutableSearch, ProcessResult, ProcessRunner } from '../../src/core/contracts/processes.js';

const IGNORED_EXIT_CODE = 0;

export const fakeProcessRunner: ProcessRunner = {
  discover(request: ExecutableSearch): Promise<readonly ExecutableResult[]> {
    return Promise.resolve(request.names.map((name) => ({ name, path: null, timedOut: false })));
  },
  run(): Promise<ProcessResult> {
    return Promise.resolve({ status: 'completed', exitCode: IGNORED_EXIT_CODE, stdout: '', stderr: '' });
  },
};
