import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import type { RuntimeDescriptor } from '../../core/contracts/runtime.js';
import type { BlockLog, Clock, RuntimeErrorLog, SessionLedger } from '../../core/contracts/session-ledger.js';
import { createBrakeEngine, type BootReader, type BrakeEngine, type ValidationCommandReader } from '../../core/services/brake-engine.js';
import { invalidSyntaxError, parseConfiguration } from '../../core/validation/configuration-validator.js';
import { NodeGitInspector } from '../git/git-inspector.js';
import { NodeProcessRunner } from '../process/node-process-runner.js';
import { NodeBootReader } from './boot-reader.js';
import { NodeBlockLog, NodeRuntimeErrorLog } from './node-runtime-logs.js';
import { NodeSessionLedger } from './node-session-ledger.js';
import { NodePlanValidationReader } from './plan-validation-reader.js';
import { isMissingFileError } from './runtime-paths.js';

export const CONFIG_RELATIVE_PATH = 'context-brake.config.json';
export const BOOT_GIT_BUDGET_MS = 1_000;
export const systemClock: Clock = { now: () => new Date() };

export type RuntimePorts = {
  readonly ledger: SessionLedger;
  readonly blocks: BlockLog;
  readonly errors: RuntimeErrorLog;
  readonly readValidationCommand: ValidationCommandReader;
  readonly readBoot: BootReader;
};
export type RuntimeServices = RuntimePorts & { readonly engine: BrakeEngine; readonly config: ContextBrakeConfig };
export type RuntimePortsInput = {
  readonly projectRoot: string;
  readonly config: ContextBrakeConfig | null;
  readonly clock: Clock;
  readonly ledger?: SessionLedger | undefined;
  readonly harness?: HarnessId;
};
export type RuntimeCompositionInput = RuntimePortsInput & { readonly descriptor: RuntimeDescriptor; readonly config: ContextBrakeConfig };

export async function loadRuntimeConfiguration(projectRoot: string): Promise<ContextBrakeConfig> {
  const filePath = resolve(projectRoot, CONFIG_RELATIVE_PATH);
  const content = await readFile(filePath, 'utf8').catch((error: unknown) => {
    if (isMissingFileError(error)) return null;
    throw error;
  });
  if (content === null) return DEFAULT_CONFIG;
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch (error) {
    throw invalidSyntaxError(filePath, content, error);
  }
  return parseConfiguration(value, filePath);
}
export function createRuntimePorts(input: RuntimePortsInput): RuntimePorts {
  const config = input.config ?? DEFAULT_CONFIG;
  const planReader = new NodePlanValidationReader(input.projectRoot, config.stateStorage.planFile);
  const errors = new NodeRuntimeErrorLog(input.projectRoot, input.clock);
  const harness = input.harness;
  const bootReader = new NodeBootReader({
    projectRoot: input.projectRoot, config, clock: input.clock,
    gitInspector: new NodeGitInspector(new NodeProcessRunner(), input.projectRoot, { budgetMilliseconds: BOOT_GIT_BUDGET_MS }),
    reportInspectionFailure: harness === undefined ? undefined : () => errors.append(harness, {
      event: 'session_reset', code: 'UNEXPECTED', detail: 'Git inspection failed.',
    }),
  });
  return {
    ledger: input.ledger ?? new NodeSessionLedger(input.projectRoot, input.clock),
    blocks: new NodeBlockLog(input.projectRoot, input.clock),
    errors,
    readValidationCommand: () => planReader.readValidationCommand(),
    readBoot: () => bootReader.readBoot(),
  };
}
export function composeRuntime(input: RuntimeCompositionInput): RuntimeServices {
  const ports = createRuntimePorts({ ...input, harness: input.descriptor.harness });
  const engine = createBrakeEngine({
    descriptor: input.descriptor, config: input.config, ledger: ports.ledger,
    blocks: ports.blocks, readValidationCommand: ports.readValidationCommand,
    readBoot: ports.readBoot, errors: ports.errors,
  });
  return { ...ports, engine, config: input.config };
}
