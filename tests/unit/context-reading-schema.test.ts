import { describe, expect, it } from 'vitest';
import { contextReadingRelativePath, contextReadingSchema, isReadingSessionId } from '../../src/core/contracts/context-reading.js';

const VALID = { v: 1, at: '2026-10-11T10:00:00.000Z', windowTokens: 1_000_000, inputTokens: 54_452, usedPercentage: 5 };

describe('context reading file contract (NFR-02, TC-12)', () => {
  it.each([
    ['all values', VALID],
    ['only the window', { ...VALID, inputTokens: null, usedPercentage: null }],
  ])('accepts %s', (_label, value) => {
    expect(contextReadingSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ['an extra field', { ...VALID, prompt: 'text' }],
    ['another version', { ...VALID, v: 2 }],
    ['a missing timestamp', { ...VALID, at: '' }],
    ['a zero window', { ...VALID, windowTokens: 0 }],
    ['negative tokens', { ...VALID, inputTokens: -1 }],
    ['a fractional token count', { ...VALID, inputTokens: 1.5 }],
    ['a percentage above 100', { ...VALID, usedPercentage: 101 }],
  ])('rejects %s', (_label, value) => {
    expect(contextReadingSchema.safeParse(value).success).toBe(false);
  });
});

describe('reading session id and path (DEC-01)', () => {
  it.each(['..', 'a/b', 'a\\b', '', 'x'.repeat(129), 'a b'])('refuses the id %j as a file name', (id) => {
    expect(isReadingSessionId(id)).toBe(false);
  });

  it('accepts a UUID and an undefined id is refused', () => {
    expect(isReadingSessionId('e4e3aa64-372c-487b-bd1b-89c1b674151a')).toBe(true);
    expect(isReadingSessionId(undefined)).toBe(false);
  });

  it('places the file under the runtime directory of the harness', () => {
    expect(contextReadingRelativePath('claude-code', 'abc-1')).toBe('.context-brake/runtime/context-readings/claude-code/abc-1.json');
  });
});
