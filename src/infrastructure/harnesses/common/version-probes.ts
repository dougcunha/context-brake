import type { VersionProbe } from '../../../core/contracts/harness.js';
import type { ProcessRunner } from '../../../core/contracts/processes.js';
import { versionFromProcess } from '../../../core/services/version-service.js';

const PROBE_TIMEOUT_MS = 2000;

export async function probeExecutableVersion(
  runner: ProcessRunner | undefined,
  executables: readonly string[],
  minimumVersion: string | null = null
): Promise<VersionProbe> {
  if (!runner) {
    return { status: 'unknown', display: null, normalized: null, source: 'executable', minimumVersion };
  }
  const discovered = await runner.discover({ names: executables, timeoutMilliseconds: PROBE_TIMEOUT_MS });
  const matched = discovered.find((item) => item.path !== null);
  if (!matched || !matched.path) {
    const timedOut = discovered.some((item) => item.timedOut);
    return {
      status: timedOut ? 'timed_out' : 'unknown',
      display: null,
      normalized: null,
      source: 'executable',
      minimumVersion,
    };
  }
  const result = await runner.run({ executable: matched.path, args: ['--version'], timeoutMilliseconds: PROBE_TIMEOUT_MS });
  return versionFromProcess({ result, source: 'executable', minimumVersion });
}
