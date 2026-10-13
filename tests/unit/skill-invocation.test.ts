import { describe, expect, it } from 'vitest';
import { dollarInvocation, sentenceInvocation, skillSlashInvocation, slashInvocation } from '../../src/core/services/skill-invocation.js';

describe('standard skill invocation formats (prd-19 FR-03, TC-03)', () => {
  it.each([
    ['slash', slashInvocation, '/sdd-snapshot'],
    ['dollar', dollarInvocation, '$sdd-snapshot'],
    ['skill slash', skillSlashInvocation, '/skill:sdd-snapshot'],
    ['sentence', sentenceInvocation, 'use the sdd-snapshot skill'],
  ])('renders the %s form', (_name, format, expected) => {
    expect(format('sdd-snapshot')).toBe(expected);
  });
  it('keeps a plugin namespace as written', () => {
    expect(slashInvocation('anthropic-skills:docs')).toBe('/anthropic-skills:docs');
  });
});
