import { INTERNAL_DEADLINE_MILLISECONDS } from '../../src/core/services/failure-policy.js';
import { antigravityAdapter } from '../../src/infrastructure/harnesses/antigravity-cli/runtime.js';
import { claudeAdapter } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { codexAdapter } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';
import { cursorAdapter } from '../../src/infrastructure/harnesses/cursor/runtime.js';
import { copilotAdapter } from '../../src/infrastructure/harnesses/github-copilot-cli/runtime.js';
import { SESSION_START_DEADLINE_MILLISECONDS } from '../../src/infrastructure/runtime/hook-deadline.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../src/infrastructure/runtime/process-hook-host.js';
import { applyEnvironment, type EnvironmentOverrides } from './environment-overrides.js';

export type ProcessHookHarness = 'claude-code' | 'codex-cli' | 'cursor' | 'github-copilot-cli' | 'antigravity-cli';
export type InProcessHookResult = { readonly code: number; readonly stdout: string; readonly stderr: string };
export type InProcessHookInvocation = {
  readonly harness: ProcessHookHarness;
  readonly projectRoot: string;
  readonly event: string;
  readonly payload: unknown;
  readonly environment?: EnvironmentOverrides;
};

const ADAPTERS: Readonly<Record<ProcessHookHarness, ProcessHarnessAdapter>> = {
  'claude-code': claudeAdapter,
  'codex-cli': codexAdapter,
  cursor: cursorAdapter,
  'github-copilot-cli': copilotAdapter,
  'antigravity-cli': antigravityAdapter,
};

export type BoundHook = { readonly harness: ProcessHookHarness; readonly projectRoot: string };

export function bindHookInProcess(harness: ProcessHookHarness, projectRoot: string): Promise<BoundHook> {
  return Promise.resolve({ harness, projectRoot });
}

export function runBoundHook(hook: BoundHook, event: string, payload: unknown): Promise<InProcessHookResult> {
  return runHookInProcess({ ...hook, event, payload });
}

export async function runHookInProcess(input: InProcessHookInvocation): Promise<InProcessHookResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const adapter: ProcessHarnessAdapter = { ...ADAPTERS[input.harness], resolveProjectRoot: () => Promise.resolve(input.projectRoot) };
  const restoreEnvironment = applyEnvironment(input.environment ?? {});
  try {
    const code = await runProcessHook(adapter, {
      argv: [process.execPath, 'context-brake-hook', input.event],
      readStdin: () => Promise.resolve(JSON.stringify(input.payload)),
      writeStdout: (text) => { stdout.push(text); },
      writeStderr: (text) => { stderr.push(text); },
      deadlineMilliseconds: INTERNAL_DEADLINE_MILLISECONDS,
      sessionStartDeadlineMilliseconds: SESSION_START_DEADLINE_MILLISECONDS,
    });
    return { code, stdout: stdout.join(''), stderr: stderr.join('') };
  } finally {
    restoreEnvironment();
  }
}
