import process from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { interruptGroup, killGroup } from '../../src/infrastructure/runner/harness-session-signals.js';

afterEach(() => vi.restoreAllMocks());

describe('POSIX harness group signals (TC-15, CR-02)', () => {
  it('sends SIGINT to the whole group and reports success', () => {
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
    expect(interruptGroup(42)).toBe(true);
    expect(kill).toHaveBeenCalledWith(-42, 'SIGINT');
  });

  it('reports an unavailable group when SIGINT fails', () => {
    vi.spyOn(process, 'kill').mockImplementation(() => { throw new TypeError('unavailable'); });
    expect(interruptGroup(42)).toBe(false);
  });

  it('treats ESRCH after SIGKILL as an already empty group', () => {
    const missing = Object.assign(new Error('gone'), { code: 'ESRCH' });
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => { throw missing; });
    expect(() => killGroup(42)).not.toThrow();
    expect(kill).toHaveBeenCalledWith(-42, 'SIGKILL');
  });

  it('sends SIGKILL to the whole group', () => {
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
    expect(() => killGroup(42)).not.toThrow();
    expect(kill).toHaveBeenCalledWith(-42, 'SIGKILL');
  });

  it('propagates other SIGKILL failures', () => {
    const denied = Object.assign(new Error('denied'), { code: 'EPERM' });
    vi.spyOn(process, 'kill').mockImplementation(() => { throw denied; });
    expect(() => killGroup(42)).toThrow(denied);
  });
});

describe('POSIX harness group kill after the leader exited (macOS CI)', () => {
  it('treats EPERM after the leader exited as a group of zombies (Darwin)', () => {
    const denied = Object.assign(new Error('denied'), { code: 'EPERM' });
    vi.spyOn(process, 'kill').mockImplementation(() => { throw denied; });
    expect(() => killGroup(42, true)).not.toThrow();
  });

  it('still propagates unexpected failures after the leader exited', () => {
    const invalid = Object.assign(new Error('invalid'), { code: 'EINVAL' });
    vi.spyOn(process, 'kill').mockImplementation(() => { throw invalid; });
    expect(() => killGroup(42, true)).toThrow(invalid);
  });
});
