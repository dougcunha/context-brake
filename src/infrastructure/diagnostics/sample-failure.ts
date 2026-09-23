export type SampleFailureCause =
  | 'asset_missing'
  | 'handler_missing'
  | 'import_error'
  | 'handler_error'
  | 'timeout'
  | 'nonzero_exit'
  | 'spawn_error';

export type SampleFailure = {
  readonly cause: SampleFailureCause;
  readonly detail: string;
};

export class SampleError extends Error {
  readonly failure: SampleFailure;
  constructor(failure: SampleFailure) {
    super(`${failure.cause}: ${failure.detail}`);
    this.name = 'SampleError';
    this.failure = failure;
  }
}

function errorLabel(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';
  const code: unknown = 'code' in error ? error.code : undefined;
  return typeof code === 'string' ? code : error.name;
}

export function describeFailure(error: unknown, fallback: SampleFailureCause): SampleFailure {
  if (error instanceof SampleError) return error.failure;
  return { cause: fallback, detail: errorLabel(error) };
}
