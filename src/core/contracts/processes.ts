export type ExecutableSearch = { readonly names: readonly string[]; readonly timeoutMilliseconds: number };
export type ExecutableResult = { readonly name: string; readonly path: string | null; readonly timedOut: boolean };
export type ProcessRequest = { readonly executable: string; readonly args: readonly string[]; readonly timeoutMilliseconds: number };
export type ProcessResult = { readonly status: 'completed' | 'failed' | 'timed_out'; readonly exitCode: number | null; readonly stdout: string; readonly stderr: string };
export interface ProcessRunner {
  discover(request: ExecutableSearch): Promise<readonly ExecutableResult[]>;
  run(request: ProcessRequest): Promise<ProcessResult>;
}
