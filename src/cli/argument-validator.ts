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

export function validateInstructionPaths(paths: readonly string[]): string[] {
  for (const p of paths) {
    if (p.startsWith('/') || p.startsWith('\\') || /^[A-Za-z]:/.test(p) || p.includes('..')) {
      throw new CliArgumentError(`Instruction file path must be repository-relative: ${p}`);
    }
  }
  return [...paths];
}
