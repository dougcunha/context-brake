import { describe, expect, it } from 'vitest';
import { main } from '../../src/cli/main.js';

describe('CLI entrypoint', () => {
  it('returns healthy for empty arguments (help)', async () => {
    expect(await main([])).toBe(0);
  });

  it('returns invalid arguments code for unknown command and json mode', async () => {
    expect(await main(['invalid-cmd'])).toBe(64);
    expect(await main(['doctor', '--unknown', '--json'])).toBe(64);
    expect(await main(['remove', '--unknown'])).toBe(64);
  });

  it('rejects the removed run, wrap, and plan commands as unknown (FR-01, FR-03, TC-01)', async () => {
    expect(await main(['plan', 'init', '--task=x'])).toBe(64);
    expect(await main(['run', '--harness', 'claude-code'])).toBe(64);
    expect(await main(['wrap', '--', 'node', '-v'])).toBe(64);
  });
});
