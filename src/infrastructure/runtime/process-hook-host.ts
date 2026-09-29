import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../core/services/brake-engine.js';
import { failureErrorCode, INTERNAL_DEADLINE_MILLISECONDS } from '../../core/services/failure-policy.js';
import { deadlineFor, HookDeadline, SESSION_START_DEADLINE_MILLISECONDS, type DeadlineLimits } from './hook-deadline.js';
import { failureDecision, type HookState } from './hook-failure.js';
import { composeRuntime, loadRuntimeConfiguration, systemClock, type RuntimePorts } from './runtime-composition.js';
import { normalizeEventToolPaths } from './tool-path-normalizer.js';

export const MAXIMUM_STDIN_BYTES = 16 * 1024 * 1024;
const NEUTRAL: RuntimeDecision = { kind: 'neutral' };

export type ProcessHarnessAdapter = {
  readonly descriptor: RuntimeDescriptor;
  readonly mapEvent: (eventName: string, payload: unknown) => RuntimeEvent | null;
  readonly mapInput: (eventName: string, payload: unknown, errors: RuntimePorts['errors']) => RuntimeInput | Promise<RuntimeInput>;
  readonly renderDecision: (decision: RuntimeDecision, eventName: string) => string | null;
  readonly resolveProjectRoot: (input: { readonly eventName: string; readonly payload: unknown }) => Promise<string>;
};
export type ProcessHookContext = {
  readonly argv: readonly string[];
  readonly readStdin: () => Promise<string>;
  readonly writeStdout: (text: string) => void;
  readonly writeStderr: (text: string) => void;
  readonly deadlineMilliseconds: number;
  readonly sessionStartDeadlineMilliseconds?: number | undefined;
};
export const defaultProcessHookContext: ProcessHookContext = {
  argv: process.argv,
  readStdin: () => readStdinUpTo(process.stdin, MAXIMUM_STDIN_BYTES),
  writeStdout: (text) => { process.stdout.write(text); },
  writeStderr: (text) => { process.stderr.write(text); },
  deadlineMilliseconds: INTERNAL_DEADLINE_MILLISECONDS,
  sessionStartDeadlineMilliseconds: SESSION_START_DEADLINE_MILLISECONDS,
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
  const deadline = new HookDeadline(context.deadlineMilliseconds, 'project_root');
  const limits = { event: context.deadlineMilliseconds, sessionStart: context.sessionStartDeadlineMilliseconds ?? SESSION_START_DEADLINE_MILLISECONDS };
  try {
    const decision = await deadline.run(dispatchHook({ adapter, context, eventName, state, deadline, limits }));
    writeDecision({ adapter, context, decision, eventName });
  } catch (error) {
    const decision = await failureDecision({ descriptor: adapter.descriptor, state, error, eventName });
    writeDecision({ adapter, context, decision, eventName });
    context.writeStderr(`ContextBrake: ${failureErrorCode(error)}\n`);
  }
  return 0;
}
type HookDispatch = { readonly adapter: ProcessHarnessAdapter; readonly context: ProcessHookContext; readonly eventName: string; readonly state: HookState; readonly deadline: HookDeadline; readonly limits: DeadlineLimits };
async function dispatchHook(input: HookDispatch): Promise<RuntimeDecision> {
  const { deadline } = input;
  const projectRoot = await input.adapter.resolveProjectRoot({ eventName: input.eventName, payload: null });
  input.state.projectRoot = projectRoot;
  deadline.mark('stdin');
  const payload = parsePayload(await input.context.readStdin());
  deadline.mark('event');
  const event = await normalizeEventToolPaths(input.adapter.mapEvent(input.eventName, payload), projectRoot);
  input.state.event = event;
  deadline.extendTo(deadlineFor(event, input.limits));
  deadline.mark('config');
  const config = await loadRuntimeConfiguration(projectRoot);
  input.state.config = config;
  if (event === null) return NEUTRAL;
  const services = composeRuntime({ projectRoot, descriptor: input.adapter.descriptor, config, clock: systemClock });
  deadline.mark('input');
  const engineInput = await input.adapter.mapInput(input.eventName, payload, services.errors);
  deadline.mark('engine');
  return services.engine.handle(event, { ...engineInput, onPhase: deadline.mark });
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
