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
});
