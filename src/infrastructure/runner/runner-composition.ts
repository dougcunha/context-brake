import { resolve } from 'node:path';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import type { ProcessRunner } from '../../core/contracts/processes.js';
import type { InterruptSignal, RunProgressListener } from '../../core/contracts/run-control.js';
import type { CommandApprover, RunLock, SessionLauncher, StepApprover } from '../../core/contracts/run-ports.js';
import type { RunnerConfiguration } from '../../core/contracts/runner-configuration.js';
import type { RunDependencies, RunSettings } from '../../core/services/run-context.js';
import { NodeProcessRunner } from '../process/node-process-runner.js';
import { systemClock } from '../runtime/runtime-composition.js';
import { NodeSessionLedger } from '../runtime/node-session-ledger.js';
import { assertHarnessArguments, resolveHarnessExecutable } from './executable-resolver.js';
import { NodeHarnessSessionProcess } from './harness-session-process.js';
import { sessionLauncherFor } from './launcher-registry.js';
import { NodeApprovalStore } from './node-approval-store.js';
import { NodeLedgerWatcher } from './node-ledger-watcher.js';
import { NodeRunLock } from './node-run-lock.js';
import { NodeRunStateAccess, type StatePaths } from './node-run-state.js';
import { NodeRunStore } from './node-run-store.js';
import { nodeHasher, nodeTimer, ResolvedExecutableLauncher, RuntimeBootTokenEstimator } from './run-system-ports.js';
import { ShellValidationExecutor } from './shell-validation-executor.js';

export type HarnessPreparation =
  | { readonly kind: 'ready'; readonly launcher: SessionLauncher }
  | { readonly kind: 'unsupported'; readonly reason: string }
  | { readonly kind: 'missing'; readonly executableNames: readonly string[] };
export type HarnessRequest = { readonly harness: HarnessId; readonly harnessArgs: readonly string[]; readonly processes?: ProcessRunner };

export type CliRunPorts = {
  readonly commandApprover: CommandApprover;
  readonly stepApprover: StepApprover | null;
  readonly interrupt: InterruptSignal;
  readonly progress: RunProgressListener;
};
export type RunCompositionInput = {
  readonly projectRoot: string;
  readonly config: ContextBrakeConfig;
  readonly launcher: SessionLauncher;
  readonly cli: CliRunPorts;
};
export type RunSettingsInput = { readonly runId: string; readonly config: ContextBrakeConfig; readonly limits: RunnerConfiguration; readonly harnessArgs: readonly string[] };

export async function prepareHarness(request: HarnessRequest): Promise<HarnessPreparation> {
  const resolution = sessionLauncherFor(request.harness);
  if (!resolution.supported) return { kind: 'unsupported', reason: resolution.reason };
  const { launcher } = resolution;
  const executable = await resolveHarnessExecutable(launcher.executableNames, { processes: request.processes ?? new NodeProcessRunner() });
  if (executable === null) return { kind: 'missing', executableNames: launcher.executableNames };
  await assertHarnessArguments(executable.executable, request.harnessArgs);
  return { kind: 'ready', launcher: new ResolvedExecutableLauncher(launcher, executable.executable) };
}

export function statePathsFor(projectRoot: string, config: ContextBrakeConfig): StatePaths {
  return { plan: resolve(projectRoot, config.stateStorage.planFile), checkpoint: resolve(projectRoot, config.stateStorage.checkpointFile) };
}

export function composeRunDependencies(input: RunCompositionInput): RunDependencies {
  const { projectRoot, config, launcher, cli } = input;
  const clock = systemClock;
  const stateFiles = statePathsFor(projectRoot, config);
  return {
    ...cli,
    launcher,
    sessions: new NodeHarnessSessionProcess({ cwd: projectRoot }),
    validator: new ShellValidationExecutor(projectRoot),
    store: new NodeRunStore({ projectRoot, stateFiles }),
    approvals: new NodeApprovalStore(projectRoot),
    watcher: new NodeLedgerWatcher(new NodeSessionLedger(projectRoot, clock)),
    clock,
    timer: nodeTimer,
    state: new NodeRunStateAccess(stateFiles),
    boot: new RuntimeBootTokenEstimator({ projectRoot, config, clock, harness: launcher.harness }),
    hasher: nodeHasher,
  };
}

export function composeRunSettings(input: RunSettingsInput): RunSettings {
  const { stateStorage, instructionFiles } = input.config;
  return {
    runId: input.runId,
    harnessArgs: [...input.harnessArgs],
    limits: input.limits,
    files: { planFile: stateStorage.planFile, checkpointFile: stateStorage.checkpointFile, protocolFile: instructionFiles.protocolFile },
  };
}

export function runLockFor(projectRoot: string): RunLock {
  return new NodeRunLock(projectRoot);
}
