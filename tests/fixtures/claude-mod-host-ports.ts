import type { ModHost } from '../../src/infrastructure/harnesses/claude-code/mod/host.js';
import type { HostState } from './claude-mod-host.js';

export type Deferred = { readonly promise: Promise<unknown>; settle(outcome: 'resolve' | 'reject'): void };

type Handlers = { resolve(value: unknown): void; reject(error: Error): void };

export const ENDED_SESSION_ID = 'session-1';
export const NEXT_SESSION_ID = 'session-2';
export const HOST_CHECK_TEXT = 'prompt.submit: called from a command.run hook, it would wait on the turn this hook is holding; submit from a later event (turn.complete) (host check)';

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

export function actionPorts(state: HostState): Pick<ModHost, 'command' | 'prompt' | 'ui'> {
  return {
    command: {
      run(input) { if (state.commandFailure) throw new TypeError('$.command.run is not a function'); state.clears.push(input.command); state.clear = deferred(); return state.clear.promise; },
      async register(spec) { if (state.registerFailure) throw new Error(`"/${spec.name}" refused`); state.registered.push(spec); return { command: spec.name }; },
    },
    prompt: { async submit(input) { if (state.isCommandHookRunning) throw new Error(HOST_CHECK_TEXT); if (state.seedFailure) throw new Error('seed rejected'); state.seeds.push(input.text); return { text: input.text }; } },
    ui: { log(text) { state.logs.push(text); } },
  };
}

export function clockPort(state: HostState): ModHost['clock'] {
  return {
    async now() { return state.now; },
    after(_ms, fn) {
      if (state.clockFailure) throw new TypeError('$.clock.after is not a function');
      const timer = { isCancelled: false };
      setImmediate(() => { if (timer.isCancelled) return; state.ticks += 1; fn(); });
      return { cancel: () => { timer.isCancelled = true; } };
    },
  };
}

export function sessionPort(root: string, state: HostState): ModHost['session'] {
  return {
    async id() { if (state.idFailure) throw new Error('id unavailable'); return state.ticks >= state.switchAtTick ? NEXT_SESSION_ID : ENDED_SESSION_ID; },
    async root() { return root; },
    async surfaces() { return state.surfaces; },
    async version() { return { version: '2.1.289' }; },
    async usage() { if (state.usage instanceof Error) throw state.usage; return state.usage; },
  };
}
