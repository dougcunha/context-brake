import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../core/services/brake-engine.js';
import { failureDetail, failureErrorCode, recordRuntimeFailure, resolveFailure, runWithinDeadline } from '../../core/services/failure-policy.js';
import { composeRuntime, createRuntimePorts, loadRuntimeConfiguration, systemClock } from './runtime-composition.js';
import { normalizeEventToolPaths } from './tool-path-normalizer.js';

export const MAXIMUM_STDIN_BYTES = 16 * 1024 * 1024;
const NEUTRAL: RuntimeDecision = { kind: 'neutral' };

export type ProcessHarnessAdapter = {
  readonly descriptor: RuntimeDescriptor;
  readonly mapEvent: (eventName: string, payload: unknown) => RuntimeEvent | null;
  readonly mapInput: (eventName: string, payload: unknown) => RuntimeInput;
  readonly renderDecision: (decision: RuntimeDecision, eventName: string) => string | null;
  readonly resolveProjectRoot: (input: { readonly eventName: string; readonly payload: unknown }) => Promise<string>;
};
export type ProcessHookContext = {
  readonly argv: readonly string[];
  readonly readStdin: () => Promise<string>;
  readonly writeStdout: (text: string) => void;
  readonly writeStderr: (text: string) => void;
  readonly deadlineMilliseconds: number;
};
type HookState = { event: RuntimeEvent | null; projectRoot: string | null; config: ContextBrakeConfig | null };
export const defaultProcessHookContext: ProcessHookContext = {
  argv: process.argv,
  readStdin: () => readStdinUpTo(process.stdin, MAXIMUM_STDIN_BYTES),
  writeStdout: (text) => { process.stdout.write(text); },
  writeStderr: (text) => { process.stderr.write(text); },
  deadlineMilliseconds: 1500,
};

export function readStdinUpTo(stream: NodeJS.ReadableStream, maximumBytes: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on('data', (chunk: Buffer) => {
      const remaining = maximumBytes - size;
      if (remaining <= 0) return;
      chunks.push(remaining >= chunk.length ? chunk : chunk.subarray(0, remaining));
      size += chunk.length;
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', (error: Error) => reject(error));
  });
}

export async function runProcessHook(adapter: ProcessHarnessAdapter, context: ProcessHookContext = defaultProcessHookContext): Promise<number> {
  const eventName = context.argv[2] ?? '';
  const state: HookState = { event: null, projectRoot: null, config: null };
  try {
    const decision = await runWithinDeadline(dispatchHook({ adapter, context, eventName, state }), context.deadlineMilliseconds);
    writeDecision({ adapter, context, decision, eventName });
  } catch (error) {
    const decision = await failureDecision({ adapter, state, error, eventName });
    writeDecision({ adapter, context, decision, eventName });
    context.writeStderr(`ContextBrake: ${failureErrorCode(error)}\n`);
  }
  return 0;
}
type HookDispatch = { readonly adapter: ProcessHarnessAdapter; readonly context: ProcessHookContext; readonly eventName: string; readonly state: HookState };
async function dispatchHook(input: HookDispatch): Promise<RuntimeDecision> {
  const projectRoot = await input.adapter.resolveProjectRoot({ eventName: input.eventName, payload: null });
  input.state.projectRoot = projectRoot;
  const payload = parsePayload(await input.context.readStdin());
  const event = await normalizeEventToolPaths(input.adapter.mapEvent(input.eventName, payload), projectRoot);
  input.state.event = event;
  const config = await loadRuntimeConfiguration(projectRoot);
  input.state.config = config;
  if (event === null) return NEUTRAL;
  const services = composeRuntime({ projectRoot, descriptor: input.adapter.descriptor, config, clock: systemClock });
  return services.engine.handle(event, input.adapter.mapInput(input.eventName, payload));
}
type FailureInput = { readonly adapter: ProcessHarnessAdapter; readonly state: HookState; readonly error: unknown; readonly eventName: string };
async function failureDecision(input: FailureInput): Promise<RuntimeDecision> {
  if (input.state.projectRoot === null) return NEUTRAL;
  const ports = createRuntimePorts({ projectRoot: input.state.projectRoot, config: input.state.config, clock: systemClock });
  if (input.state.event === null) {
    await recordRuntimeFailure(ports.errors, { harness: input.adapter.descriptor.harness, event: input.eventName, code: failureErrorCode(input.error), detail: failureDetail(input.error) });
    return NEUTRAL;
  }
  try {
    return await resolveFailure({ event: input.state.event, code: failureErrorCode(input.error), detail: failureDetail(input.error), config: input.state.config, ledger: ports.ledger, errors: ports.errors, readValidationCommand: ports.readValidationCommand });
  } catch {
    return NEUTRAL;
  }
}
type DecisionWrite = { readonly adapter: ProcessHarnessAdapter; readonly context: ProcessHookContext; readonly decision: RuntimeDecision; readonly eventName: string };
function writeDecision(input: DecisionWrite): void {
  const text = input.adapter.renderDecision(input.decision, input.eventName);
  if (text !== null && text !== '') input.context.writeStdout(text);
}
function parsePayload(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
