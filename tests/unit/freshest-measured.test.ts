import { describe, expect, it } from 'vitest';
import type { ContextReading } from '../../src/core/contracts/context-reading.js';
import { freshestMeasured } from '../../src/infrastructure/harnesses/claude-code/mod-reading.js';

const EARLIER = '2026-10-11T10:00:00.000Z';
const LATER = '2026-10-11T10:00:05.000Z';
const WINDOW = 1_000_000;

function reading(overrides: Partial<ContextReading>): ContextReading {
  return { v: 1, at: LATER, windowTokens: WINDOW, inputTokens: 200, usedPercentage: 1, ...overrides };
}

describe('freshest measured usage of transcript and mod reading (FR-02, TC-03)', () => {
  it('has nothing without either source', () => {
    expect(freshestMeasured(null, null)).toBeUndefined();
  });

  it('keeps the transcript alone with no window', () => {
    expect(freshestMeasured({ tokens: 100, at: EARLIER }, null)).toEqual({ tokens: 100, contextWindow: null, at: EARLIER });
  });

  it('uses the reading alone with its tokens and window', () => {
    expect(freshestMeasured(null, reading({}))).toEqual({ tokens: 200, contextWindow: WINDOW, at: LATER });
  });

  it.each([
    { relation: 'newer', readingAt: LATER, transcriptAt: EARLIER, tokens: 200 },
    { relation: 'equal in age', readingAt: LATER, transcriptAt: LATER, tokens: 200 },
    { relation: 'older', readingAt: EARLIER, transcriptAt: LATER, tokens: 100 },
  ])('with a reading $relation than the transcript takes $tokens tokens from the fresher and the window from the reading', ({ readingAt, transcriptAt, tokens }) => {
    const measured = freshestMeasured({ tokens: 100, at: transcriptAt }, reading({ at: readingAt }));
    expect(measured).toMatchObject({ tokens, contextWindow: WINDOW });
  });

  it('takes the tokens from the transcript when the reading has only the window', () => {
    const windowOnly = reading({ inputTokens: null, usedPercentage: null });
    expect(freshestMeasured({ tokens: 100, at: EARLIER }, windowOnly)).toEqual({ tokens: 100, contextWindow: WINDOW, at: EARLIER });
  });

  it('reports the window with no tokens when only a window-only reading exists', () => {
    const windowOnly = reading({ inputTokens: null, usedPercentage: null });
    expect(freshestMeasured(null, windowOnly)).toEqual({ tokens: null, contextWindow: WINDOW, at: LATER });
  });
});
