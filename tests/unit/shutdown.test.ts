import process from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../src/cli/main.js';
import { EXIT_CODES } from '../../src/cli/exit-codes.js';
import { InterruptFlag, SignalRouter, signalRouter, type ShutdownController } from '../../src/cli/shutdown.js';

function controller(): ShutdownController & { readonly calls: string[] } {
  const calls: string[] = [];
  return { calls, shutdown: (signal) => calls.push(signal) };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('SignalRouter delegation (DEC-12, RF12)', () => {
  it('exits with the interrupt code when no command registered a controller', () => {
    const exit = vi.fn();
    new SignalRouter(exit).handle('SIGINT');
    expect(exit).toHaveBeenCalledExactlyOnceWith(EXIT_CODES.interrupted);
  });

  it('delegates the first signal to the registered controller and ignores repeated signals', () => {
    const exit = vi.fn();
    const router = new SignalRouter(exit);
    const target = controller();
    router.register(target);
    router.handle('SIGINT');
    router.handle('SIGINT');
    router.handle('SIGTERM');
    expect(target.calls).toEqual(['SIGINT']);
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('SignalRouter after unregistering (DEC-12)', () => {
  it('keeps ignoring signals after a delivered shutdown unregisters its controller', () => {
    const exit = vi.fn();
    const router = new SignalRouter(exit);
    const unregister = router.register(controller());
    router.handle('SIGTERM');
    unregister();
    router.handle('SIGINT');
    expect(exit).not.toHaveBeenCalled();
  });

  it('falls back to exiting after a controller unregisters without a signal', () => {
    const exit = vi.fn();
    const router = new SignalRouter(exit);
    const first = router.register(controller());
    const second = controller();
    router.register(second);
    first();
    router.handle('SIGINT');
    expect(second.calls).toEqual(['SIGINT']);
  });
});

describe('InterruptFlag (DEC-12)', () => {
  it('reports the request and notifies once', () => {
    const notices: string[] = [];
    const flag = new InterruptFlag((signal) => notices.push(signal));
    expect(flag.isRequested()).toBe(false);
    flag.shutdown('SIGINT');
    flag.shutdown('SIGTERM');
    expect(flag.isRequested()).toBe(true);
    expect(notices).toEqual(['SIGINT']);
  });
});

describe('main signal registration (DEC-12, TC-22 unit fallback)', () => {
  it('routes SIGINT and SIGTERM to the registered controller once', async () => {
    const before = { SIGINT: process.listeners('SIGINT'), SIGTERM: process.listeners('SIGTERM') };
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await main(['--help']);
    const added = (['SIGINT', 'SIGTERM'] as const).map((signal) => process.listeners(signal).find((listener) => !before[signal].includes(listener)));
    const target = controller();
    const unregister = signalRouter.register(target);
    try {
      for (const listener of [...added, ...added]) (listener as (signal: NodeJS.Signals) => void)('SIGINT');
      expect(target.calls).toEqual(['SIGINT']);
    } finally {
      unregister();
      added.forEach((listener, index) => process.removeListener((['SIGINT', 'SIGTERM'] as const)[index] as NodeJS.Signals, listener as () => void));
    }
  });
});
