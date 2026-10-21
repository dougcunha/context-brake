import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CommandSpec, ModHost, ModUsage } from '../../src/infrastructure/harnesses/claude-code/mod/host.js';
import { actionPorts, clockPort, sessionPort, type Deferred } from './claude-mod-host-ports.js';

export type HostState = {
  readonly clears: string[];
  readonly seeds: string[];
  readonly logs: string[];
  readonly accessed: string[];
  readonly registered: CommandSpec[];
  readonly store: Map<string, unknown>;
  readonly env: Map<string, string>;
  surfaces: readonly string[];
  usage: ModUsage | Error;
  now: number;
  ticks: number;
  switchAtTick: number;
  readFailure: boolean;
  seedFailure: boolean;
  storeWriteFailure: boolean;
  registerFailure: boolean;
  idFailure: boolean;
  clockFailure: boolean;
  commandFailure: boolean;
  isCommandHookRunning: boolean;
  clear: Deferred | undefined;
};

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

export function createHostState(now: number): HostState {
  return { clears: [], seeds: [], logs: [], accessed: [], registered: [], store: new Map(), env: new Map(), surfaces: ['terminal'], usage: { context: { window: 1_000_000 } }, now, ticks: 0, switchAtTick: Number.POSITIVE_INFINITY, readFailure: false, seedFailure: false, storeWriteFailure: false, registerFailure: false, idFailure: false, clockFailure: false, commandFailure: false, isCommandHookRunning: false, clear: undefined };
}

export function createHost(root: string, state: HostState): ModHost {
  return {
    fs: fsPort(state),
    store: storePort(state),
    ...actionPorts(state),
    env: { async get(name) { return state.env.get(name); } },
    session: sessionPort(root, state),
    clock: clockPort(state),
  };
}

export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
