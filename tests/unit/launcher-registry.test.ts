import { describe, expect, it } from 'vitest';
import { HARNESS_IDS } from '../../src/core/contracts/harness.js';
import type { ExecutableResult, ExecutableSearch, ProcessResult, ProcessRunner } from '../../src/core/contracts/processes.js';
import { assertHarnessArguments, resolveHarnessExecutable } from '../../src/infrastructure/runner/executable-resolver.js';
import { sessionLauncherFor, UNSUPPORTED_RUN_REASONS } from '../../src/infrastructure/runner/launcher-registry.js';

const linux = { platform: 'linux' as const, environment: {} };

function processes(found: Readonly<Record<string, string>>): ProcessRunner & { searches: ExecutableSearch[] } {
  const searches: ExecutableSearch[] = [];
  return {
    searches,
    async discover(request: ExecutableSearch): Promise<readonly ExecutableResult[]> {
      searches.push(request);
      return request.names.map((name) => ({ name, path: found[name] ?? null, timedOut: false }));
    },
    async run(): Promise<ProcessResult> {
      return { status: 'failed', exitCode: null, stdout: '', stderr: '' };
    },
  };
}

describe('launcher registry (DEC-02, CMP-19)', () => {
  it.each([['claude-code', 'claude'], ['codex-cli', 'codex']] as const)('supports %s with the %s executable', (harness, executable) => {
    const resolution = sessionLauncherFor(harness);
    expect(resolution.supported).toBe(true);
    if (!resolution.supported) return;
    expect(resolution.launcher.harness).toBe(harness);
    expect(resolution.launcher.executableNames).toEqual([executable]);
  });

  it('names the missing documented guarantee for every other harness', () => {
    const unsupported = HARNESS_IDS.filter((id) => id !== 'claude-code' && id !== 'codex-cli');
    expect(Object.keys(UNSUPPORTED_RUN_REASONS).sort()).toEqual([...unsupported].sort());
    for (const harness of unsupported) expect(sessionLauncherFor(harness)).toEqual({ supported: false, reason: UNSUPPORTED_RUN_REASONS[harness] });
    expect(UNSUPPORTED_RUN_REASONS.cursor).toContain('hooks or plugins');
    expect(UNSUPPORTED_RUN_REASONS.pi).toContain('project trust');
    expect(UNSUPPORTED_RUN_REASONS['oh-my-pi']).toContain('no non-interactive mode');
  });
});

describe('harness executable resolver (DEC-04, DEC-21)', () => {
  it('returns null when no executable name is on PATH', async () => {
    expect(await resolveHarnessExecutable(['claude'], { processes: processes({}), host: linux })).toBeNull();
  });

  it('returns the first discovered name and spawns it directly off Windows', async () => {
    const runner = processes({ codex: '/usr/local/bin/codex' });
    expect(await resolveHarnessExecutable(['codex'], { processes: runner, host: linux })).toEqual({ executable: 'codex', shim: false });
    expect(runner.searches[0]?.timeoutMilliseconds).toBeGreaterThan(0);
  });

  it('accepts shell metacharacters in arguments outside Windows shims', async () => {
    await expect(assertHarnessArguments('claude', ['50%', 'a|b'], linux)).resolves.toBeUndefined();
  });
});
