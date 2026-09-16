import { pathToFileURL } from 'node:url';

const WARMUP_COUNT = 10;
const SAMPLE_COUNT = 100;
const SESSION_ID = 'context-brake-benchmark';

type HookHandler = (first: unknown, second: unknown) => unknown;
type HookRecord = Record<string, unknown>;

export type BenchmarkContext = {
  readonly cwd: string;
  readonly getContextUsage: () => unknown;
  readonly sessionManager: { readonly getSessionId: () => string };
  readonly ui: { readonly notify: (message: string) => void };
};

export type InProcessBenchmark = {
  readonly assetPath: string;
  readonly event: string;
  readonly payload: unknown;
};

type SelectedHandler = { readonly handler: HookHandler; readonly returnedHooks: boolean };

function isHookRecord(value: unknown): value is HookRecord {
  return typeof value === 'object' && value !== null;
}

export function createBenchmarkContext(): BenchmarkContext {
  return {
    cwd: process.cwd(),
    getContextUsage: () => ({ tokens: 42000, contextWindow: 128000, percent: 33 }),
    sessionManager: { getSessionId: () => SESSION_ID },
    ui: { notify: () => {} },
  };
}

function selectHandler(returned: unknown, handlers: ReadonlyMap<string, HookHandler>, event: string): SelectedHandler | null {
  if (isHookRecord(returned) && typeof returned[event] === 'function') {
    return { handler: returned[event] as HookHandler, returnedHooks: true };
  }
  const registered = handlers.get(event);
  return registered === undefined ? null : { handler: registered, returnedHooks: false };
}

function invocationArgs(selected: SelectedHandler, payload: unknown, context: BenchmarkContext): [unknown, unknown] {
  if (selected.returnedHooks && isHookRecord(payload)) return [payload.input, payload.output];
  return [payload, context];
}

async function runSamples(handler: HookHandler, args: [unknown, unknown]): Promise<number[]> {
  for (let index = 0; index < WARMUP_COUNT; index++) await handler(...args);
  const samples: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index++) {
    const start = performance.now();
    await handler(...args);
    samples.push(performance.now() - start);
  }
  return samples;
}

export async function sampleInProcess(benchmark: InProcessBenchmark): Promise<number[] | null> {
  const module = (await import(pathToFileURL(benchmark.assetPath).href)) as { default?: unknown };
  const handlers = new Map<string, HookHandler>();
  const api = { on: (event: string, handler: HookHandler): void => { handlers.set(event, handler); } };
  const returned = typeof module.default === 'function' ? module.default(api) : undefined;
  const selected = selectHandler(returned, handlers, benchmark.event);
  if (selected === null) return null;
  return runSamples(selected.handler, invocationArgs(selected, benchmark.payload, createBenchmarkContext()));
}
