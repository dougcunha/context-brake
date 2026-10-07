import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { acceptsDeclaredWindow } from '../../src/core/services/window-trust.js';

describe('declared window acceptance (prd-09 FR-05, prd-12 DEC-09)', () => {
  it('accepts the declared window only when the harness reports no context usage', () => {
    expect(acceptsDeclaredWindow([{ id: 'context_usage', state: 'unsupported' }])).toBe(true);
    expect(acceptsDeclaredWindow([{ id: 'context_usage', state: 'supported' }])).toBe(false);
    expect(acceptsDeclaredWindow([])).toBe(false);
  });
  it('costs at most 10 tokens for the window field (NFR-02)', () => {
    expect(getEncoding('o200k_base').encode(' window=declared').length).toBeLessThanOrEqual(10);
  });
});
