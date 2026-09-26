import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapStatuslinePayload } from '../../src/infrastructure/harnesses/claude-code/statusline-payload.js';

const FIXTURE = JSON.parse(await readFile(resolve('tests/fixtures/harnesses/claude-code/statusline.json'), 'utf8')) as { context_window: Record<string, unknown> };

function withWindow(overrides: Record<string, unknown>): unknown {
  return { ...FIXTURE, context_window: { ...FIXTURE.context_window, ...overrides } };
}

describe('status line payload mapping (FR-03, DEC-04, CMP-03)', () => {
  it('maps the documented example to the session key and the five values', () => {
    expect(mapStatuslinePayload(FIXTURE)).toEqual({
      session: { harness: 'claude-code', sessionId: 'abc123', agentId: null },
      line: { windowTokens: 200000, inputTokens: 15500, usedPercentage: 8, model: 'claude-opus-5-5' },
    });
  });

  it.each([
    ['a null current_usage', { current_usage: null }],
    ['zero total input tokens', { total_input_tokens: 0 }],
    ['negative total input tokens', { total_input_tokens: -5 }],
    ['non-numeric total input tokens', { total_input_tokens: '15500' }],
  ])('maps input tokens to null for %s', (_case, overrides) => {
    expect(mapStatuslinePayload(withWindow(overrides))?.line.inputTokens).toBeNull();
  });

  it.each([
    ['a zero window', { context_window_size: 0 }, 'windowTokens'],
    ['a fractional window', { context_window_size: 1.5 }, 'windowTokens'],
    ['a null percentage', { used_percentage: null }, 'usedPercentage'],
    ['a percentage above 100', { used_percentage: 101 }, 'usedPercentage'],
  ] as const)('maps %s to null', (_case, overrides, field) => {
    expect(mapStatuslinePayload(withWindow(overrides))?.line[field]).toBeNull();
  });
});

describe('status line payload edge cases (FR-03, NFR-02, CMP-03)', () => {
  it('maps a missing context window and model to null values', () => {
    expect(mapStatuslinePayload({ session_id: 's' })?.line).toEqual({ windowTokens: null, inputTokens: null, usedPercentage: null, model: null });
  });

  it('maps a model id longer than 200 characters to null', () => {
    expect(mapStatuslinePayload({ ...FIXTURE, model: { id: 'm'.repeat(201) } })?.line.model).toBeNull();
  });

  it.each([
    ['null', null],
    ['a missing session_id', { context_window: FIXTURE.context_window }],
    ['an empty session_id', { session_id: '' }],
    ['a non-object context window', { session_id: 's', context_window: 5 }],
  ])('returns no record for %s', (_case, payload) => {
    expect(mapStatuslinePayload(payload)).toBeNull();
  });
});
