import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ModHost } from '../../src/infrastructure/harnesses/claude-code/mod/host.js';

type Deferred = { readonly promise: Promise<unknown>; settle(outcome: 'resolve' | 'reject'): void };

export type HostState = {
  readonly clears: string[];
  readonly seeds: string[];
  readonly logs: string[];
  readonly accessed: string[];
  readonly store: Map<string, unknown>;
  readonly env: Map<string, string>;
  surfaces: readonly string[];
  now: number;
  readFailure: boolean;
  seedFailure: boolean;
  storeWriteFailure: boolean;
  clear: Deferred | undefined;
};

type Handlers = { resolve(value: unknown): void; reject(error: Error): void };

function noop(): void {
  return undefined;
}

function deferred(): Deferred {
  const handlers: Handlers = { resolve: noop, reject: noop };
  const promise = new Promise<unknown>((resolve, reject) => {
    handlers.resolve = resolve;
    handlers.reject = reject;
  });
  return { promise, settle: (outcome) => (outcome === 'resolve' ? handlers.resolve({ text: '' }) : handlers.reject(new Error('clear rejected'))) };
}

function fsPort(state: HostState): ModHost['fs'] {
  return {
    async read(path) {
      state.accessed.push(path);
      if (state.readFailure) throw new Error('read failed');
      return readFile(path, 'utf8');
    },
    async write(path, text) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, text, 'utf8');
    },
    async exists(path) {
      state.accessed.push(path);
      return stat(path).then(() => true, () => false);
    },
    async stat(path) {
      state.accessed.push(path);
      return { mtimeMs: (await stat(path)).mtimeMs };
    },
  };
}

function storePort(state: HostState): ModHost['store'] {
  return {
    async get(key) { return state.store.get(key); },
    async set(key, value) { if (state.storeWriteFailure) throw new Error('store write failed'); state.store.set(key, value); },
    async delete(key) { state.store.delete(key); },
  };
}

function actionPorts(state: HostState): Pick<ModHost, 'command' | 'prompt' | 'ui'> {
  return {
    command: { run(input) { state.clears.push(input.command); state.clear = deferred(); return state.clear.promise; } },
    prompt: { async submit(input) { if (state.seedFailure) throw new Error('seed rejected'); state.seeds.push(input.text); return { text: input.text }; } },
    ui: { log(text) { state.logs.push(text); } },
  };
}

export function createHostState(now: number): HostState {
  return { clears: [], seeds: [], logs: [], accessed: [], store: new Map(), env: new Map(), surfaces: ['terminal'], now, readFailure: false, seedFailure: false, storeWriteFailure: false, clear: undefined };
}

export function createHost(root: string, state: HostState): ModHost {
  return {
    fs: fsPort(state),
    store: storePort(state),
    ...actionPorts(state),
    env: { async get(name) { return state.env.get(name); } },
    session: { async id() { return 'session-1'; }, async root() { return root; }, async surfaces() { return state.surfaces; }, async version() { return { version: '2.1.289' }; } },
    clock: { async now() { return state.now; } },
  };
}

export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
