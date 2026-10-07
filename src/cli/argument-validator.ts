import { HARNESS_IDS, type HarnessId } from '../core/contracts/harness.js';

export class CliArgumentError extends Error {
  readonly code = 'INVALID_ARGUMENTS' as const;
  readonly exitCode = 64 as const;
  constructor(message: string) {
    super(message);
  }
}

export function validateHarnessIds(harnesses: readonly string[]): HarnessId[] {
  for (const id of harnesses) {
    if (!HARNESS_IDS.includes(id as HarnessId)) {
      throw new CliArgumentError(`Unknown harness '${id}'.`);
    }
  }
  return harnesses as HarnessId[];
}

export function validateInclusionExclusion(included: readonly HarnessId[], excluded: readonly HarnessId[]): void {
  const incSet = new Set(included);
  for (const ex of excluded) {
    if (incSet.has(ex)) {
      throw new CliArgumentError(`Harness '${ex}' cannot be both included and excluded.`);
    }
  }
}
