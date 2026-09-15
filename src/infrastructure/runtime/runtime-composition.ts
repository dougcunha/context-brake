import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { RuntimeDescriptor } from '../../core/contracts/runtime.js';
import type { BlockLog, Clock, RuntimeErrorLog, SessionLedger } from '../../core/contracts/session-ledger.js';
import { createBrakeEngine, type BrakeEngine, type ValidationCommandReader } from '../../core/services/brake-engine.js';
import { invalidSyntaxError, parseConfiguration } from '../../core/validation/configuration-validator.js';
import { NodeBlockLog, NodeRuntimeErrorLog } from './node-runtime-logs.js';
import { NodeSessionLedger } from './node-session-ledger.js';
import { NodePlanValidationReader } from './plan-validation-reader.js';
import { isMissingFileError } from './runtime-paths.js';

export const CONFIG_RELATIVE_PATH = 'context-brake.config.json';
export const systemClock: Clock = { now: () => new Date() };

export type RuntimePorts = {
  readonly ledger: SessionLedger;
  readonly blocks: BlockLog;
  readonly errors: RuntimeErrorLog;
  readonly readValidationCommand: ValidationCommandReader;
};
export type RuntimeServices = RuntimePorts & { readonly engine: BrakeEngine; readonly config: ContextBrakeConfig };
export type RuntimePortsInput = {
  readonly projectRoot: string;
  readonly config: ContextBrakeConfig | null;
  readonly clock: Clock;
  readonly ledger?: SessionLedger | undefined;
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
  return {
    ledger: input.ledger ?? new NodeSessionLedger(input.projectRoot, input.clock),
    blocks: new NodeBlockLog(input.projectRoot, input.clock),
    errors: new NodeRuntimeErrorLog(input.projectRoot, input.clock),
    readValidationCommand: () => planReader.readValidationCommand(),
  };
}
export function composeRuntime(input: RuntimeCompositionInput): RuntimeServices {
  const ports = createRuntimePorts(input);
  const engine = createBrakeEngine({ descriptor: input.descriptor, config: input.config, ledger: ports.ledger, blocks: ports.blocks, readValidationCommand: ports.readValidationCommand });
  return { ...ports, engine, config: input.config };
}
