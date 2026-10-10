import { describe, expect, it } from 'vitest';
import { acceptsDeclaredWindow } from '../../src/core/services/window-trust.js';

describe('declared window acceptance (prd-09 FR-05, prd-12 DEC-09)', () => {
  it('accepts the declared window only when the harness reports no context usage', () => {
    expect(acceptsDeclaredWindow([{ id: 'context_usage', state: 'unsupported' }])).toBe(true);
    expect(acceptsDeclaredWindow([{ id: 'context_usage', state: 'supported' }])).toBe(false);
    expect(acceptsDeclaredWindow([{ id: 'session_boot', state: 'unsupported' }, { id: 'context_usage', state: 'supported' }])).toBe(false);
    expect(acceptsDeclaredWindow([])).toBe(false);
  });
});
