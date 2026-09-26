import { describe, expect, it } from 'vitest';
import { z } from 'zod/mini';
import { parseLedgerLines, resetLineSchema, sessionLineSchema, toolLineSchema } from '../../src/core/contracts/session-ledger.js';
import { statuslineLineSchema, STATUSLINE_MODEL_MAX_LENGTH } from '../../src/core/contracts/statusline-line.js';

const AT = '2026-09-25T12:00:00.000Z';
const VALID = { v: 1, type: 'statusline', at: AT, windowTokens: 1000000, inputTokens: 200000, usedPercentage: 20, model: 'claude-opus-5-5' } as const;
const TOOL = { v: 1, type: 'tool', at: AT, toolUseId: 'toolu_1', observedCharacters: 10, turn: 1, usedTokens: 10, windowTokens: 128000, estimatedTokens: 10, source: 'estimated', zone: 'GREEN' } as const;

describe('statusline ledger line schema (FR-03, DEC-04, TC-01)', () => {
  it('accepts a line with the five recorded values', () => {
    expect(statuslineLineSchema.safeParse(VALID).success).toBe(true);
  });

  it('accepts null for every recorded value', () => {
    const line = { ...VALID, windowTokens: null, inputTokens: null, usedPercentage: null, model: null };
    expect(statuslineLineSchema.safeParse(line).success).toBe(true);
  });

  it('accepts the boundary values zero tokens, 0% and 100%, and a 200-char model', () => {
    expect(statuslineLineSchema.safeParse({ ...VALID, inputTokens: 0, usedPercentage: 0 }).success).toBe(true);
    expect(statuslineLineSchema.safeParse({ ...VALID, usedPercentage: 100, model: 'm'.repeat(STATUSLINE_MODEL_MAX_LENGTH) }).success).toBe(true);
  });

  it.each([
    ['a zero window', { windowTokens: 0 }],
    ['a fractional window', { windowTokens: 1.5 }],
    ['negative input tokens', { inputTokens: -1 }],
    ['a percentage above 100', { usedPercentage: 100.1 }],
    ['a negative percentage', { usedPercentage: -0.1 }],
    ['a 201-char model', { model: 'm'.repeat(STATUSLINE_MODEL_MAX_LENGTH + 1) }],
    ['an unknown field', { cost: 1 }],
  ])('rejects %s', (_case, override) => {
    expect(statuslineLineSchema.safeParse({ ...VALID, ...override }).success).toBe(false);
  });
});

describe('statusline ledger line parsing (FR-03, NFR-04, TC-01)', () => {
  it('parses the line as a ledger line next to the existing line types', () => {
    const content = [JSON.stringify(TOOL), JSON.stringify(VALID)].join('\n');
    expect(parseLedgerLines(content).map((line) => line.type)).toEqual(['tool', 'statusline']);
  });

  it('is skipped without error by a parser that only knows the previous line types (NFR-04)', () => {
    const previousUnion = z.union([sessionLineSchema, toolLineSchema, resetLineSchema]);
    const parsed = [TOOL, VALID].map((value) => previousUnion.safeParse(value)).filter((result) => result.success);
    expect(parsed).toHaveLength(1);
  });
});
